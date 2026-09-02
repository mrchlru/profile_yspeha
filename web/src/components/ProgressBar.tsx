import React from "react";

export type ProgressBarProps = {
  answeredQuestions: number;
  totalQuestions: number;
};

export function ProgressBar({
  answeredQuestions,
  totalQuestions,
}: ProgressBarProps): React.ReactElement {
  const safeTotal = Math.max(totalQuestions, 1);
  const clampedAnswered = Math.max(0, Math.min(answeredQuestions, safeTotal));
  const percent = (clampedAnswered / safeTotal) * 100;

  return (
    <div
      className="w-full"
      aria-label="Прогресс опроса"
      role="progressbar"
      aria-valuenow={clampedAnswered}
      aria-valuemin={0}
      aria-valuemax={safeTotal}
    >
      <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#F6D34A] via-[#7ED67C] to-[#00B596] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

