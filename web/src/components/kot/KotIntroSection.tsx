"use client";

import React from "react";
import { Button } from "@/components/Button";
import {
  questionCardSurfaceClass,
  stepNavPrimaryButtonClass,
  stepQuestionTitleClass,
  stepSecondaryTextClass,
} from "@/lib/stepPageTheme";
import { useFormStore } from "@/store/useFormStore";

const KOT_INTRO_PARAGRAPHS: string[] = [
  "Краткий ориентировочный тест (КОТ, Бузин / Вандерлик): 50 заданий по учебному пособию (Пашукова и др., 1996).",
  "На выполнение теста отводится 20 минут (таймер запускается после нажатия «СТАРТ»). Отвечайте на столько пунктов, на сколько успеваете; не задерживайтесь долго на одном задании.",
  "Когда время истечёт, неотвеченные задания засчитываются как неверные (по методичке Ип — число верных ответов из 50), и откроется следующий раздел автоматически — нажимать «Далее» не требуется.",
  "Порядок заданий как в бланке: с 1 по 50. Задания с чертежами (17, 29, 32, 50) показаны по сканам из методички.",
];

export type KotIntroSectionProps = {
  showStartButton: boolean;
};

export function KotIntroSection({ showStartButton }: KotIntroSectionProps): React.ReactElement {
  const startKotTimer = useFormStore((s) => s.startKotTimer);

  return (
    <section className={`${questionCardSurfaceClass} mb-4 p-6 sm:px-8 sm:py-6`}>
      <h2 className={stepQuestionTitleClass}>Интеллектуальный блок (КОТ)</h2>
      <div className={`mt-3 space-y-2 ${stepSecondaryTextClass}`}>
        {KOT_INTRO_PARAGRAPHS.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {showStartButton ? (
        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            onClick={() => startKotTimer()}
            className={`${stepNavPrimaryButtonClass} min-w-[200px] px-10 py-3 text-base font-semibold uppercase tracking-wide`}
          >
            СТАРТ
          </Button>
        </div>
      ) : null}
    </section>
  );
}
