import sharp from "sharp";

import { ensureYoloModelFile } from "@/lib/proctor/ensureYoloModel";

/** COCO: person. */
export const YOLO_COCO_PERSON_CLASS = 0;
/** COCO: cell phone. */
export const YOLO_COCO_CELL_PHONE_CLASS = 67;

const YOLO_INPUT_SIZE = 640;
/** Person: выше порог — меньше ложных «двух людей» от отражений и фрагментов. */
const PERSON_CONFIDENCE_THRESHOLD = 0.42;
/** Cell phone: ниже порог — веб-камера плохо ловит телефон при 0.35+. */
const PHONE_CONFIDENCE_THRESHOLD = 0.2;
const IOU_THRESHOLD = 0.4;
/** Минимальная доля площади кадра для person (отсекает мелкий шум). */
const MIN_PERSON_AREA_RATIO = 0.02;
/** Минимальная доля площади кадра для phone. */
const MIN_PHONE_AREA_RATIO = 0.002;

export type YoloDetection = {
  classId: number;
  label: string;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type YoloSnapshotAnalysis = {
  personCount: number;
  phoneCount: number;
  detections: ReadonlyArray<YoloDetection>;
};

const CLASS_LABELS: Record<number, string> = {
  [YOLO_COCO_PERSON_CLASS]: "person",
  [YOLO_COCO_CELL_PHONE_CLASS]: "cell phone",
};

let sessionPromise: Promise<import("onnxruntime-node").InferenceSession> | null = null;

/**
 * Запускает YOLOv8n ONNX на JPEG-кадре (person / cell phone).
 */
export async function analyzeSnapshotWithYolo(jpegBuffer: Buffer): Promise<YoloSnapshotAnalysis> {
  const session = await _getSession();
  const { tensor } = await _preprocessImage(jpegBuffer);
  const ort = await import("onnxruntime-node");
  const inputName = session.inputNames[0] ?? "images";
  const feeds = {
    [inputName]: new ort.Tensor("float32", tensor, [1, 3, YOLO_INPUT_SIZE, YOLO_INPUT_SIZE]),
  };
  const result = await session.run(feeds);
  const outputName = session.outputNames[0] ?? "output0";
  const output = result[outputName];
  if (!output || !(output.data instanceof Float32Array)) {
    throw new Error("YOLO output missing");
  }

  const meta = await sharp(jpegBuffer).rotate().metadata();
  const origWidth = meta.width ?? YOLO_INPUT_SIZE;
  const origHeight = meta.height ?? YOLO_INPUT_SIZE;
  const frameArea = Math.max(1, origWidth * origHeight);

  const detections = _decodeDetections(output.data, origWidth, origHeight);
  const sizeFiltered = detections.filter((item) => {
    const area = Math.max(0, item.x2 - item.x1) * Math.max(0, item.y2 - item.y1);
    const ratio = area / frameArea;
    if (item.classId === YOLO_COCO_PERSON_CLASS) {
      return ratio >= MIN_PERSON_AREA_RATIO;
    }
    if (item.classId === YOLO_COCO_CELL_PHONE_CLASS) {
      return ratio >= MIN_PHONE_AREA_RATIO;
    }
    return false;
  });
  const filtered = _applyNms(sizeFiltered);

  return {
    personCount: filtered.filter((item) => item.classId === YOLO_COCO_PERSON_CLASS).length,
    phoneCount: filtered.filter((item) => item.classId === YOLO_COCO_CELL_PHONE_CLASS).length,
    detections: filtered,
  };
}

async function _getSession(): Promise<import("onnxruntime-node").InferenceSession> {
  if (sessionPromise === null) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-node");
      const modelPath = await ensureYoloModelFile();
      return ort.InferenceSession.create(modelPath, {
        executionProviders: ["cpu"],
      });
    })();
  }
  return sessionPromise;
}

async function _preprocessImage(jpegBuffer: Buffer): Promise<{ tensor: Float32Array }> {
  const image = sharp(jpegBuffer).rotate();
  const meta = await image.metadata();
  const origWidth = meta.width ?? YOLO_INPUT_SIZE;
  const origHeight = meta.height ?? YOLO_INPUT_SIZE;
  const scale = Math.min(YOLO_INPUT_SIZE / origWidth, YOLO_INPUT_SIZE / origHeight);
  const resizedWidth = Math.max(1, Math.round(origWidth * scale));
  const resizedHeight = Math.max(1, Math.round(origHeight * scale));
  const padLeft = Math.floor((YOLO_INPUT_SIZE - resizedWidth) / 2);
  const padTop = Math.floor((YOLO_INPUT_SIZE - resizedHeight) / 2);
  const padRight = YOLO_INPUT_SIZE - resizedWidth - padLeft;
  const padBottom = YOLO_INPUT_SIZE - resizedHeight - padTop;

  const { data } = await image
    .resize(resizedWidth, resizedHeight)
    .extend({
      top: padTop,
      bottom: padBottom,
      left: padLeft,
      right: padRight,
      background: { r: 114, g: 114, b: 114 },
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = YOLO_INPUT_SIZE * YOLO_INPUT_SIZE;
  const tensor = new Float32Array(3 * pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    const r = data[i * 3]! / 255;
    const g = data[i * 3 + 1]! / 255;
    const b = data[i * 3 + 2]! / 255;
    tensor[i] = r;
    tensor[pixelCount + i] = g;
    tensor[2 * pixelCount + i] = b;
  }

  return { tensor };
}

/**
 * Декодирует выходы YOLOv8: отдельно проверяет person и cell phone по своим порогам
 * (не только «лучший класс» якоря — иначе телефон часто теряется).
 */
function _decodeDetections(output: Float32Array, origWidth: number, origHeight: number): YoloDetection[] {
  const numClasses = 80;
  const numPredictions = output.length / (4 + numClasses);
  const scale = Math.min(YOLO_INPUT_SIZE / origWidth, YOLO_INPUT_SIZE / origHeight);
  const padLeft = (YOLO_INPUT_SIZE - origWidth * scale) / 2;
  const padTop = (YOLO_INPUT_SIZE - origHeight * scale) / 2;
  const detections: YoloDetection[] = [];

  for (let i = 0; i < numPredictions; i += 1) {
    const personScore = output[(4 + YOLO_COCO_PERSON_CLASS) * numPredictions + i] ?? 0;
    const phoneScore = output[(4 + YOLO_COCO_CELL_PHONE_CLASS) * numPredictions + i] ?? 0;
    const keepPerson = personScore >= PERSON_CONFIDENCE_THRESHOLD;
    const keepPhone = phoneScore >= PHONE_CONFIDENCE_THRESHOLD;
    if (!keepPerson && !keepPhone) {
      continue;
    }

    const cx = output[i] ?? 0;
    const cy = output[numPredictions + i] ?? 0;
    const w = output[2 * numPredictions + i] ?? 0;
    const h = output[3 * numPredictions + i] ?? 0;

    const x1 = (cx - w / 2 - padLeft) / scale;
    const y1 = (cy - h / 2 - padTop) / scale;
    const x2 = (cx + w / 2 - padLeft) / scale;
    const y2 = (cy + h / 2 - padTop) / scale;
    const box = {
      x1: Math.max(0, x1),
      y1: Math.max(0, y1),
      x2: Math.min(origWidth, x2),
      y2: Math.min(origHeight, y2),
    };

    if (keepPerson) {
      detections.push({
        classId: YOLO_COCO_PERSON_CLASS,
        label: CLASS_LABELS[YOLO_COCO_PERSON_CLASS]!,
        confidence: personScore,
        ...box,
      });
    }
    if (keepPhone) {
      detections.push({
        classId: YOLO_COCO_CELL_PHONE_CLASS,
        label: CLASS_LABELS[YOLO_COCO_CELL_PHONE_CLASS]!,
        confidence: phoneScore,
        ...box,
      });
    }
  }

  return detections;
}

function _applyNms(detections: YoloDetection[]): YoloDetection[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: YoloDetection[] = [];

  for (const candidate of sorted) {
    const overlaps = kept.some(
      (item) => item.classId === candidate.classId && _iou(item, candidate) > IOU_THRESHOLD
    );
    if (!overlaps) {
      kept.push(candidate);
    }
  }

  return kept;
}

function _iou(a: YoloDetection, b: YoloDetection): number {
  const interX1 = Math.max(a.x1, b.x1);
  const interY1 = Math.max(a.y1, b.y1);
  const interX2 = Math.min(a.x2, b.x2);
  const interY2 = Math.min(a.y2, b.y2);
  const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  const union = areaA + areaB - interArea;
  return union <= 0 ? 0 : interArea / union;
}
