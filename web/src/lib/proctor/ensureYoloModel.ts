import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const MODEL_URL = "https://huggingface.co/Kalray/yolov8/resolve/main/yolov8n.onnx";

/**
 * Возвращает путь к локальной копии YOLOv8n ONNX.
 */
export function resolveYoloModelPath(): string {
  return join(process.cwd(), "models", "yolov8n.onnx");
}

/**
 * Скачивает YOLOv8n, если файла ещё нет.
 */
export async function ensureYoloModelFile(): Promise<string> {
  const modelPath = resolveYoloModelPath();
  if (existsSync(modelPath)) {
    return modelPath;
  }

  await mkdir(dirname(modelPath), { recursive: true });
  const response = await fetch(MODEL_URL);
  if (!response.ok) {
    throw new Error(`Не удалось скачать YOLOv8n: HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(modelPath, bytes);
  return modelPath;
}
