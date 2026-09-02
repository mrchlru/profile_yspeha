"use client";

import React from "react";
import { Button } from "@/components/Button";
import {
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
  stepSectionTitleClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";

export type BurnoutQuestionsLayoutProps = {
  answered: number;
  total: number;
  children: React.ReactNode;
  canComplete: boolean;
  onComplete: () => void;
};

/**
 * Обёртка экрана с вопросами теста Маслач.
 */
export function BurnoutQuestionsLayout({
  answered,
  total,
  children,
  canComplete,
  onComplete,
}: BurnoutQuestionsLayoutProps): React.ReactElement {
  const percent = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0;

  return (
    <div className="flex flex-1 justify-center px-4 pb-10 pt-2">
      <div className="w-full max-w-[900px]">
        <div className={`mb-5 px-5 py-5 sm:px-6 ${stepSurfaceCardClass}`}>
          <h1 className={stepSectionTitleClass}>Тест на выгорание</h1>
          <p className={`mt-2 ${stepSecondaryTextClass}`}>
            Отвечено: {String(answered)} из {String(total)}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-[#00B596] transition-all"
              style={{ width: `${String(percent)}%` }}
            />
          </div>
        </div>

        {children}

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            disabled={!canComplete}
            onClick={onComplete}
            className={stepNavPrimaryButtonClass}
          >
            Завершить тест
          </Button>
        </div>
      </div>
    </div>
  );
}
