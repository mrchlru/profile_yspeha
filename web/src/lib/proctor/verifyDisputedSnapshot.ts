import sharp from "sharp";

import { analyzeSnapshotWithYolo } from "@/lib/proctor/runYoloSnapshotInference";
import {
  PROCTOR_EVENT_FACE_MISSING,
  PROCTOR_EVENT_GAZE_AWAY,
  PROCTOR_EVENT_MULTIPLE_FACES,
  type ProctorEventKind,
} from "@/lib/proctor/proctorEventKinds";

export type SnapshotVerificationResult = {
  /** Для совместимости с БД: число людей по YOLO или лиц по MediaPipe. */
  serverFaceCount: number;
  serverPersonCount: number;
  serverPhoneCount: number;
  serverVerified: boolean;
  method: "yolov8" | "mediapipe_face";
  detections?: ReadonlyArray<{
    label: string;
    confidence: number;
  }>;
};

let faceDetectorPromise: Promise<{
  detectFaceCount: (jpegBuffer: Buffer) => Promise<number>;
}> | null = null;

/**
 * Перепроверяет спорный кадр на сервере: YOLOv8 (person / phone), fallback — MediaPipe.
 */
export async function verifyDisputedSnapshot(
  jpegBuffer: Buffer,
  kind: ProctorEventKind,
  clientFaceCount: number | null
): Promise<SnapshotVerificationResult | null> {
  try {
    const yolo = await analyzeSnapshotWithYolo(jpegBuffer);
    return {
      serverFaceCount: yolo.personCount,
      serverPersonCount: yolo.personCount,
      serverPhoneCount: yolo.phoneCount,
      serverVerified: _isViolationConfirmed(kind, yolo.personCount, clientFaceCount),
      method: "yolov8",
      detections: yolo.detections.map((item) => ({
        label: item.label,
        confidence: Math.round(item.confidence * 1000) / 1000,
      })),
    };
  } catch {
    return _verifyWithMediaPipe(jpegBuffer, kind, clientFaceCount);
  }
}

async function _verifyWithMediaPipe(
  jpegBuffer: Buffer,
  kind: ProctorEventKind,
  clientFaceCount: number | null
): Promise<SnapshotVerificationResult | null> {
  try {
    const detector = await _getFaceDetector();
    const serverFaceCount = await detector.detectFaceCount(jpegBuffer);
    return {
      serverFaceCount,
      serverPersonCount: serverFaceCount,
      serverPhoneCount: 0,
      serverVerified: _isViolationConfirmed(kind, serverFaceCount, clientFaceCount),
      method: "mediapipe_face",
    };
  } catch {
    return null;
  }
}

async function _getFaceDetector(): Promise<{
  detectFaceCount: (jpegBuffer: Buffer) => Promise<number>;
}> {
  if (faceDetectorPromise === null) {
    faceDetectorPromise = _loadFaceDetector();
  }
  return faceDetectorPromise;
}

async function _loadFaceDetector(): Promise<{
  detectFaceCount: (jpegBuffer: Buffer) => Promise<number>;
}> {
  const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );
  const faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    minDetectionConfidence: 0.5,
  });

  return {
    async detectFaceCount(buffer: Buffer): Promise<number> {
      const { data, info } = await sharp(buffer)
        .rotate()
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const clamped = new Uint8ClampedArray(data);
      const imageData = new ImageData(clamped, info.width, info.height);
      const result = faceDetector.detect(imageData);
      return result.detections.length;
    },
  };
}

function _isViolationConfirmed(
  kind: ProctorEventKind,
  serverPersonCount: number,
  clientFaceCount: number | null
): boolean {
  if (kind === PROCTOR_EVENT_FACE_MISSING) {
    return serverPersonCount === 0;
  }
  if (kind === PROCTOR_EVENT_MULTIPLE_FACES) {
    return serverPersonCount >= 2 || (clientFaceCount !== null && clientFaceCount >= 2);
  }
  if (kind === PROCTOR_EVENT_GAZE_AWAY) {
    return serverPersonCount === 1;
  }
  return serverPersonCount !== 1;
}
