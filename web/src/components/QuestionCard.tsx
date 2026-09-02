import React from "react";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
  stepSecondaryTextClass,
} from "@/lib/stepPageTheme";

export type QuestionCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function QuestionCard({
  title,
  description,
  children,
}: QuestionCardProps): React.ReactElement {
  return (
    <section className={`${questionCardSurfaceClass} p-6 sm:px-8 sm:py-6`}>
      <header className="mb-3">
        <h2 className={stepQuestionTitleClass}>{title}</h2>
        {description ? (
          <p className={`mt-1 ${stepSecondaryTextClass}`}>{description}</p>
        ) : null}
      </header>
      <div className={`${stepSecondaryTextClass} [&_label]:cursor-pointer [&_label]:select-none`}>
        {children}
      </div>
    </section>
  );
}

