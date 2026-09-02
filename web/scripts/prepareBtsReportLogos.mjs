/**
 * Готовит PNG логотипов BTS для отчётов из JPEG (белый wordmark на чёрном фоне).
 * Запуск: node scripts/prepareBtsReportLogos.mjs [путь-к-исходнику]
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const defaultSrc = path.join(
  process.cwd(),
  "public/branding/_source-bts-wordmark-on-dark.jpg"
);

async function main() {
  const src = process.argv[2] ? path.resolve(process.argv[2]) : defaultSrc;
  if (!fs.existsSync(src)) {
    console.error("Нет исходника:", src);
    process.exit(1);
  }
  const outDir = path.join(process.cwd(), "public/branding");
  const onLight = path.join(outDir, "bts-logo-on-light-bg.png");
  const onDark = path.join(outDir, "bts-logo-on-dark-bg.png");

  await _writeVariant(src, onLight, "black");
  await _writeVariant(src, onDark, "white");
  await _normalizeReportLogo(outDir);
  console.log("OK", onLight, onDark);
}

/** Нормализует `report-logo.png` для шапки тестов (убирает огромные чёрные поля). */
async function _normalizeReportLogo(outDir) {
  const legacy = path.join(outDir, "report-logo.png");
  const backup = path.join(outDir, "_report-logo-source.png");
  if (!fs.existsSync(legacy)) {
    console.warn("skip report-logo normalize: нет", legacy);
    return;
  }
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(legacy, backup);
  }
  const source = backup;
  const crop = { left: 645, top: 646, width: 90, height: 90 };
  const { data, info } = await sharp(source)
    .extract(crop)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (Math.max(data[o], data[o + 1], data[o + 2]) < 45) {
      data[o + 3] = 0;
    }
  }
  const mark = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
  const outSize = 128;
  const markSize = 112;
  await sharp(mark)
    .resize(markSize, markSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: Math.floor((outSize - markSize) / 2),
      bottom: Math.ceil((outSize - markSize) / 2),
      left: Math.floor((outSize - markSize) / 2),
      right: Math.ceil((outSize - markSize) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(legacy);
  const meta = await sharp(legacy).metadata();
  console.log(path.basename(legacy), meta.width, meta.height);
}

async function _writeVariant(input, output, ink) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const max = Math.max(r, g, b);
    if (max < 40) {
      data[o + 3] = 0;
      continue;
    }
    const v = ink === "white" ? 255 : 0;
    data[o] = v;
    data[o + 1] = v;
    data[o + 2] = v;
    data[o + 3] = 255;
  }
  let pipeline = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  pipeline = pipeline.trim({ threshold: 2 });
  await pipeline.png().toFile(output);
  const meta = await sharp(output).metadata();
  console.log(path.basename(output), meta.width, meta.height);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
