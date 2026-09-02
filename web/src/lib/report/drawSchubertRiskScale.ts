import type { PDFFont, PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";

import {
  SCHUBERT_SCALE_MAX,
  SCHUBERT_SCALE_MIN,
  SCHUBERT_SCALE_ZONES,
} from "@/lib/audit/report/keys/auditScoringKeys";

const ZONE_COLORS: ReadonlyArray<ReturnType<typeof rgb>> = [
  rgb(0.82, 0.87, 0.96),
  rgb(0.86, 0.94, 0.88),
  rgb(0.98, 0.88, 0.8),
];

const BAR_OUTLINE = rgb(0.55, 0.55, 0.55);
const MARKER = rgb(0, 0.71, 0.59);
const TEXT_MUTED = rgb(0.45, 0.45, 0.45);

/**
 * Рисует горизонтальную шкалу готовности к риску Шуберта (−50…+50) с маркером суммы.
 * Возвращает высоту блока в pt (для сдвига курсора в PDF).
 */
export function drawSchubertRiskScale(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  topY: number,
  width: number,
  sum: number
): number {
  const titleSize = 9;
  const tickSize = 7;
  const barH = 16;
  const markerH = 10;
  const gap = 6;
  const legendSize = 7.5;

  const title = "Шкала готовности к риску (−50 … +50)";
  page.drawText(title, {
    x,
    y: topY - titleSize,
    size: titleSize,
    font: fontBold,
    color: TEXT_MUTED,
  });

  const barTop = topY - titleSize - gap - barH;
  const barBottom = barTop;
  page.drawRectangle({
    x,
    y: barBottom,
    width,
    height: barH,
    borderColor: BAR_OUTLINE,
    borderWidth: 0.8,
    color: rgb(0.96, 0.96, 0.96),
  });

  for (let i = 0; i < SCHUBERT_SCALE_ZONES.length; i += 1) {
    const zone = SCHUBERT_SCALE_ZONES[i]!;
    const x1 = _valueToX(zone.from, x, width);
    const x2 = _valueToX(zone.to, x, width);
    page.drawRectangle({
      x: Math.min(x1, x2),
      y: barBottom + 1,
      width: Math.abs(x2 - x1),
      height: barH - 2,
      color: ZONE_COLORS[i] ?? ZONE_COLORS[0]!,
    });
  }

  const ticks = [-50, -30, -10, 0, 10, 20, 50] as const;
  for (const tick of ticks) {
    const tickX = _valueToX(tick, x, width);
    page.drawLine({
      start: { x: tickX, y: barBottom },
      end: { x: tickX, y: barBottom + barH },
      thickness: 0.6,
      color: BAR_OUTLINE,
    });
    const label = tick > 0 ? `+${String(tick)}` : String(tick);
    const labelW = font.widthOfTextAtSize(label, tickSize);
    page.drawText(label, {
      x: tickX - labelW / 2,
      y: barBottom - tickSize - 3,
      size: tickSize,
      font,
      color: TEXT_MUTED,
    });
  }

  const markerX = _valueToX(sum, x, width);
  const markerBaseY = barBottom + barH;
  page.drawLine({
    start: { x: markerX, y: markerBaseY },
    end: { x: markerX, y: markerBaseY + markerH },
    thickness: 2,
    color: MARKER,
  });
  page.drawCircle({
    x: markerX,
    y: markerBaseY + markerH + 3,
    size: 4,
    color: MARKER,
  });

  const sumLabel = `Ваш результат: ${sum > 0 ? "+" : ""}${String(sum)}`;
  const sumLabelW = fontBold.widthOfTextAtSize(sumLabel, titleSize);
  page.drawText(sumLabel, {
    x: Math.min(Math.max(x, markerX - sumLabelW / 2), x + width - sumLabelW),
    y: markerBaseY + markerH + 10,
    size: titleSize,
    font: fontBold,
    color: MARKER,
  });

  const legendY = barBottom - tickSize - 16;
  for (let i = 0; i < SCHUBERT_SCALE_ZONES.length; i += 1) {
    const zone = SCHUBERT_SCALE_ZONES[i]!;
    const zoneMid = (zone.from + zone.to) / 2;
    const legendX = _valueToX(zoneMid, x, width);
    const legendW = font.widthOfTextAtSize(zone.shortLabel, legendSize);
    page.drawText(zone.shortLabel, {
      x: legendX - legendW / 2,
      y: legendY,
      size: legendSize,
      font,
      color: TEXT_MUTED,
    });
  }

  const totalHeight = topY - legendY + legendSize + 8;
  return totalHeight;
}

function _valueToX(value: number, barX: number, barW: number): number {
  const clamped = Math.max(SCHUBERT_SCALE_MIN, Math.min(SCHUBERT_SCALE_MAX, value));
  const t = (clamped - SCHUBERT_SCALE_MIN) / (SCHUBERT_SCALE_MAX - SCHUBERT_SCALE_MIN);
  return barX + t * barW;
}
