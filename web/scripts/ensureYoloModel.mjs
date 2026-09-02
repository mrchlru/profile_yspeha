import { createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const MODEL_URL = "https://huggingface.co/Kalray/yolov8/resolve/main/yolov8n.onnx";

/**
 * CLI: скачивает YOLOv8n ONNX в `web/models/`.
 */
async function main() {
  const modelPath = join(process.cwd(), "models", "yolov8n.onnx");
  if (existsSync(modelPath)) {
    console.log(`YOLO model ready: ${modelPath}`);
    return;
  }

  await mkdir(dirname(modelPath), { recursive: true });
  const response = await fetch(MODEL_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Не удалось скачать YOLOv8n: HTTP ${response.status}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(modelPath));
  console.log(`YOLO model ready: ${modelPath}`);
}

void main();
