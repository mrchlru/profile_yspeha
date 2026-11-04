"use client";

import React from "react";

import { surveyPageBgClass } from "@/lib/survey/surveyConstructorTheme";

export type CustomSurveyRespondentLayoutProps = {
  children: React.ReactNode;
};

/**
 * Оболочка прохождения опроса: широкая вёрстка для ПК, без лишних элементов скрининга.
 */
export function CustomSurveyRespondentLayout({
  children,
}: CustomSurveyRespondentLayoutProps): React.ReactElement {
  return (
    <div className={`min-h-screen ${surveyPageBgClass}`}>
      <div className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        {children}
      </div>
    </div>
  );
}
