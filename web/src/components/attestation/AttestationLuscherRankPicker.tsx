"use client";

import React, { useMemo } from "react";

import {
  LUSCHER_COLORS,
  luscherRankAnswerKey,
  type LuscherColor,
} from "@/lib/attestation/attestationQuestions";
import { stepSecondaryTextClass, stepSurfaceCardClass } from "@/lib/stepPageTheme";
import { Button } from "@/components/Button";

export type AttestationLuscherRankPickerProps = {
  answers: Readonly<Record<string, number | string | null>>;
  onSetRank: (colorId: number, rank: number) => void;
  onReset: () => void;
};

/**
 * Выбор порядка предпочтения восьми цветов (клик по порядку 1→8).
 */
export function AttestationLuscherRankPicker({
  answers,
  onSetRank,
  onReset,
}: AttestationLuscherRankPickerProps): React.ReactElement {
  const rankByColorId = useMemo(() => {
    const map = new Map<number, number>();
    for (const color of LUSCHER_COLORS) {
      const value = answers[luscherRankAnswerKey(color.id)];
      if (typeof value === "number") {
        map.set(color.id, value);
      }
    }
    return map;
  }, [answers]);

  const nextRank =
    rankByColorId.size < 8 ? rankByColorId.size + 1 : null;

  function handleColorClick(color: LuscherColor): void {
    if (rankByColorId.has(color.id) || nextRank === null) {
      return;
    }
    onSetRank(color.id, nextRank);
  }

  return (
    <div className={`space-y-4 px-5 py-5 sm:px-6 ${stepSurfaceCardClass}`}>
      <p className={stepSecondaryTextClass}>
        Нажимайте цвета по порядку от самого приятного (1) к наименее приятному (8).
        {nextRank !== null ? ` Следующий выбор: ${String(nextRank)}.` : " Все ранги назначены."}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LUSCHER_COLORS.map((color) => {
          const rank = rankByColorId.get(color.id);
          const isAssigned = rank !== undefined;
          return (
            <button
              key={String(color.id)}
              type="button"
              disabled={isAssigned || nextRank === null}
              onClick={() => handleColorClick(color)}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 transition ${
                isAssigned
                  ? "border-[#00B596] bg-white"
                  : "border-black/10 bg-white/80 hover:border-[#00B596]/50 disabled:opacity-60"
              }`}
            >
              <span
                className="h-12 w-full rounded-xl border border-black/10 shadow-inner"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-[13px] font-bold text-[#5F5E5E]">{color.name}</span>
              {isAssigned ? (
                <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#00B596] text-[13px] font-extrabold text-white">
                  {String(rank)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={onReset}>
          Сбросить порядок
        </Button>
      </div>
    </div>
  );
}
