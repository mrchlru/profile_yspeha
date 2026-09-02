"use client";

import React from "react";
import { Button } from "@/components/Button";
import {
  stepSecondaryTextClass,
  stepSurfaceCardClass,
  stepSectionTitleClass,
  stepNavPrimaryButtonClass,
} from "@/lib/stepPageTheme";
import type { AuditIntroText } from "@/lib/audit/auditIntros";
import { AuditCfitIntroWorkedExamplePanel } from "@/components/audit/AuditCfitIntroWorkedExamplePanel";

export type AuditTestIntroProps = {
  /** Номер шага, отображается в подзаголовке: «Шаг N из 22». */
  stepIndex: number;
  /** Всего шагов в маршруте. */
  totalSteps: number;
  /** Текст инструкции (заголовок + абзацы), как у Fisom lab. */
  intro: AuditIntroText;
  /** Кнопка «Далее»: вызывается переход к экрану вопросов. */
  onProceed: () => void;
  /** Текст кнопки. По умолчанию «Далее». */
  proceedLabel?: string;
};

/**
 * Экран «Описание задач теста» / «Инструкция» перед каждым шагом аудита.
 *
 * Воспроизводит структуру Fisom lab: заголовок → абзацы инструкции → кнопка «Далее».
 * После нажатия родитель решает, что показывать (вопросы шага); таймер запускается
 * только после нажатия «Далее» (этим занимается родительский компонент шага).
 */
export function AuditTestIntro({
  stepIndex,
  totalSteps,
  intro,
  onProceed,
  proceedLabel = "Далее",
}: AuditTestIntroProps): React.ReactElement {
  return (
    <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2">
      <div className={`w-full max-w-[860px] px-8 py-8 ${stepSurfaceCardClass}`}>
        <p className={`mb-2 text-[14px] uppercase tracking-wide ${stepSecondaryTextClass}`}>
          {`Шаг ${String(stepIndex)} из ${String(totalSteps)}`}
        </p>
        <h2 className={stepSectionTitleClass}>{intro.heading}</h2>

        <div className="space-y-4">
          {intro.paragraphs.map((paragraph, idx) => (
            <p
              key={`intro-paragraph-${String(idx)}`}
              className={`text-[18px] sm:text-[19px] ${stepSecondaryTextClass}`}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {intro.cfitWorkedExample !== undefined ? (
          <AuditCfitIntroWorkedExamplePanel example={intro.cfitWorkedExample} />
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={onProceed} className={`${stepNavPrimaryButtonClass} min-w-[200px]`}>
            {proceedLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
