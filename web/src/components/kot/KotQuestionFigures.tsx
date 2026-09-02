import React from "react";

import type { KotFigureSlot } from "@/lib/kot/kotOfficial50Questions";

/** Растровые скриншоты из методички (public/kot). */
const KOT_FIGURE_RASTER: Record<KotFigureSlot, readonly string[]> = {
  q17: ["/kot/q17.png"],
  /** Задание 29 — одна цельная иллюстрация (разрез фигуры для сложения в квадрат). */
  q29: ["/kot/q29.png"],
  q32: ["/kot/q32.png"],
  q50: ["/kot/q50.png"],
};

/**
 * Рисунки к заданиям КОТ с пространственными фигурами — по сканам учебного пособия.
 */
export function KotQuestionFigure(props: { readonly kind: KotFigureSlot }): React.ReactElement {
  const paths = KOT_FIGURE_RASTER[props.kind];
  return (
    <div className="mb-4 overflow-x-auto rounded-lg border border-black/10 bg-white p-4">
      <div className="flex flex-col items-center gap-4">
        {paths.map((src) => (
          // Сканы методички произвольного размера; статика из public/kot.
          // eslint-disable-next-line @next/next/no-img-element -- растровые PNG без фиксированных пропорций в билде
          <img
            key={src}
            src={src}
            alt=""
            className="mx-auto h-auto max-h-[min(70vh,520px)] w-full max-w-3xl object-contain"
          />
        ))}
      </div>
    </div>
  );
}
