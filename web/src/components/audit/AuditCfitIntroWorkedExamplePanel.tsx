"use client";

import React, { useState } from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
  stepSecondaryTextClass,
} from "@/lib/stepPageTheme";
import type { AuditCfitIntroWorkedExample } from "@/lib/audit/questions/cfit/cfitIntroWorkedExample";
import { AUDIT_CFIT_CHOICE_DIGITS } from "@/lib/audit/questions/cfit/cfitSubtestItems";

type AuditCfitIntroWorkedExamplePanelProps = {
  /** Ровно один пример на стартовом экране CFIT. */
  example: AuditCfitIntroWorkedExample;
};

/**
 * Статическая карточка «пример решения» без ввода ответа: стимул (если есть) и пять
 * вариантов; верный вариант подсвечен, как в интерфейсе теста.
 */
export function AuditCfitIntroWorkedExamplePanel({
  example,
}: AuditCfitIntroWorkedExamplePanelProps): React.ReactElement {
  const hasStimulus =
    example.stimulusSrc !== null && example.stimulusSrc.length > 0;
  return (
    <div className={`mt-8 ${questionCardSurfaceClass} px-5 py-5 sm:px-6 sm:py-6`}>
      <p className={`${stepQuestionTitleClass} mb-2 text-[#00B596]`}>Пример задания</p>
      <p className={`mb-4 text-[16px] leading-snug ${stepSecondaryTextClass}`}>
        Один учебный пример того же вида, что и в тесте. Правильный вариант в примере:{" "}
        <span className="font-extrabold text-[#00B596]">{example.solutionDigit}</span>.
      </p>
      {hasStimulus ? (
        <div className="mb-4 overflow-x-auto rounded-2xl border border-black/10 bg-white/90 p-3">
          <IntroExampleFigure
            src={example.stimulusSrc as string}
            alt="Учебный пример, условие"
            variant="stimulus"
          />
        </div>
      ) : null}
      <div
        className="flex flex-wrap justify-center gap-3"
        role="group"
        aria-label="Варианты учебного примера"
      >
        {AUDIT_CFIT_CHOICE_DIGITS.map((digit) => {
          const isSolution = digit === example.solutionDigit;
          const choiceSrc = example.choiceSrcs[digit];
          return (
            <div
              key={digit}
              className={_choiceCellClass(isSolution)}
              aria-current={isSolution ? "true" : undefined}
            >
              <span
                className={`text-[15px] font-extrabold ${isSolution ? "text-[#00B596]" : "text-[#5F5E5E]"}`}
              >
                {digit}
              </span>
              {choiceSrc !== undefined && choiceSrc.length > 0 ? (
                <div className="w-full rounded-xl bg-white/90 p-1">
                  <IntroExampleFigure
                    src={choiceSrc}
                    alt={`Учебный пример, вариант ${digit}`}
                    variant="choice"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function _choiceCellClass(isSolution: boolean): string {
  const base =
    "flex min-w-[100px] max-w-[200px] flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center sm:min-w-[112px]";
  const solutionCls =
    "border-[#00B596] bg-[#00B596]/12 shadow-[0px_4px_18px_0px_rgba(0,181,150,0.25)]";
  const restCls = "border-black/10 bg-white/85";
  return `${base} ${isSolution ? solutionCls : restCls}`;
}

type IntroExampleFigureProps = {
  src: string;
  alt: string;
  variant: "stimulus" | "choice";
};

function IntroExampleFigure(props: IntroExampleFigureProps): React.ReactElement {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="flex min-h-[80px] items-center justify-center px-4 py-6 text-center text-[14px] text-[#5F5E5E]">
        Не удалось загрузить рисунок.
      </div>
    );
  }
  const compactStimulus =
    "mx-auto h-auto max-h-[min(38vh,260px)] w-full max-w-xl object-contain sm:max-h-[min(42vh,300px)] sm:max-w-2xl";
  const sizeCls =
    props.variant === "stimulus" ? compactStimulus : "mx-auto h-auto max-h-[140px] w-full max-w-[160px] object-contain";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- статика из public
    <img
      src={props.src}
      alt={props.alt}
      className={sizeCls}
      onError={() => setBroken(true)}
    />
  );
}
