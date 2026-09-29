"use client";

import React from "react";
import type {
  SpecialistScreeningOptionId,
  SpecialistScreeningQuestion,
  SpecialistScreeningSectionId,
} from "@/lib/specialistScreening/specialistScreeningQuestions";
import {
  ASRS_OPTIONS,
  PHQ_GAD_OPTIONS,
  SPECIALIST_SCREENING_SECTION_CANDIDATE_TITLES,
  SPECIALIST_SCREENING_SECTION_PROMPTS,
} from "@/lib/specialistScreening/specialistScreeningQuestions";
import {
  questionCardSurfaceClass,
  stepQuestionTitleClass,
  stepSecondaryTextClass,
  stepSectionTitleClass,
} from "@/lib/stepPageTheme";

export type SpecialistScreeningLikertListProps = {
  sections: ReadonlyArray<{
    sectionId: SpecialistScreeningSectionId;
    questions: ReadonlyArray<SpecialistScreeningQuestion>;
  }>;
  answers: Readonly<Record<string, SpecialistScreeningOptionId | null>>;
  onAnswer: (questionId: string, value: SpecialistScreeningOptionId) => void;
};

/**
 * Список вопросов скрининга с секциями PHQ-9 / GAD-7 / ASRS.
 */
export function SpecialistScreeningLikertList({
  sections,
  answers,
  onAnswer,
}: SpecialistScreeningLikertListProps): React.ReactElement {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.sectionId} className="space-y-3">
          <div className="px-1">
            <h2 className={stepSectionTitleClass}>
              {SPECIALIST_SCREENING_SECTION_CANDIDATE_TITLES[section.sectionId]}
            </h2>
            <p className={`mt-1 ${stepSecondaryTextClass}`}>
              {SPECIALIST_SCREENING_SECTION_PROMPTS[section.sectionId]}
            </p>
          </div>
          <ol className="space-y-3" type="1">
            {section.questions.map((question) => {
              const current = answers[question.id] ?? null;
              const options =
                question.scale === "asrs" ? ASRS_OPTIONS : PHQ_GAD_OPTIONS;
              return (
                <li
                  key={question.id}
                  className={`${questionCardSurfaceClass} px-5 py-4 sm:px-6 sm:py-5`}
                >
                  <p className={`${stepQuestionTitleClass} mb-3`}>
                    <span className="mr-2 text-[#00B596]">
                      {`${String(question.indexInSection)}.`}
                    </span>
                    {question.text}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => (
                      <OptionChoice
                        key={String(option.id)}
                        isActive={current === option.id}
                        label={option.label}
                        onClick={() =>
                          onAnswer(question.id, option.id as SpecialistScreeningOptionId)
                        }
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

function OptionChoice({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}): React.ReactElement {
  const base =
    "flex-1 min-w-[100px] rounded-2xl px-2 py-3 text-center text-[12px] sm:text-[13px] font-extrabold transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35";
  const activeCls =
    "bg-[#00B596] text-white shadow-[0px_4px_18px_0px_rgba(0,181,150,0.35)]";
  const inactiveCls =
    "bg-white/85 text-[#5F5E5E] hover:bg-white border border-black/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${isActive ? activeCls : inactiveCls}`}
    >
      {label}
    </button>
  );
}
