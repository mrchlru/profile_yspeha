"use client";

import React, { memo } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { KotPairColumns } from "@/components/kot/KotPairColumns";
import { KotQuestionFigure } from "@/components/kot/KotQuestionFigures";
import type { KotOfficialSpec } from "@/lib/kot/kotOfficial50Questions";
import { stepSecondaryTextClass } from "@/lib/stepPageTheme";
import { useFormStore } from "@/store/useFormStore";

export type KotQuestionItemProps = {
  spec: KotOfficialSpec;
  displayNum: number;
  value: string | null | undefined;
  blockAnswers: boolean;
};

function KotQuestionItemInner({
  spec,
  displayNum,
  value,
  blockAnswers,
}: KotQuestionItemProps): React.ReactElement {
  const patchStep1Answer = useFormStore((s) => s.patchStep1Answer);
  const title = `${String(displayNum)}. ${spec.prompt}`;
  const figure =
    spec.figure !== undefined ? <KotQuestionFigure kind={spec.figure} /> : null;
  const pairBlock =
    spec.kind === "text" && spec.pairColumnRows !== undefined ? (
      <KotPairColumns rows={spec.pairColumnRows} />
    ) : null;

  if (spec.kind === "mc") {
    return (
      <QuestionCard title={title}>
        {figure}
        {pairBlock}
        <div className="space-y-2">
          {spec.options.map((opt) => {
            const inputId = `kot-${spec.key}-${opt.id}`;
            const checked = value === opt.id;
            return (
              <label
                key={opt.id}
                htmlFor={inputId}
                className="flex cursor-pointer select-none items-start gap-3"
              >
                <input
                  id={inputId}
                  type="radio"
                  name={spec.key}
                  value={opt.id}
                  checked={checked}
                  disabled={blockAnswers}
                  onChange={() => patchStep1Answer(spec.key, opt.id)}
                  className="mt-1 accent-[#00B596] disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </QuestionCard>
    );
  }

  const textVal = value ?? "";
  return (
    <QuestionCard title={title}>
      {figure}
      {pairBlock}
      <label className="block">
        <span className={`mb-1 block text-sm ${stepSecondaryTextClass}`}>
          {spec.placeholder ?? "Ответ"}
        </span>
        <input
          type="text"
          name={spec.key}
          value={textVal}
          disabled={blockAnswers}
          onChange={(e) => patchStep1Answer(spec.key, e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[15px] text-[#1a1a1a] outline-none ring-[#00B596]/30 focus:border-[#00B596] focus:ring-2 disabled:cursor-not-allowed disabled:bg-black/[0.04] disabled:text-black/50"
          autoComplete="off"
        />
      </label>
    </QuestionCard>
  );
}

function propsEqual(prev: KotQuestionItemProps, next: KotQuestionItemProps): boolean {
  return (
    prev.spec === next.spec &&
    prev.displayNum === next.displayNum &&
    prev.value === next.value &&
    prev.blockAnswers === next.blockAnswers
  );
}

export const KotQuestionItem = memo(KotQuestionItemInner, propsEqual);
