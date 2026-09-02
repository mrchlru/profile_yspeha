"use client";

import React from "react";
import { getMotivationLine } from "@/lib/testMotivation";

export type TestMotivationProps = {
  profileName: string;
  answeredCount: number;
};

/**
 * Персональная мотивационная строка под прогресс-баром.
 */
export function TestMotivation({
  profileName,
  answeredCount,
}: TestMotivationProps): React.ReactElement {
  const line = getMotivationLine(profileName, answeredCount);

  return (
    <p className="mt-3 text-[17px] font-normal leading-snug text-[#5F5E5E] sm:text-[18px]">
      {line}
    </p>
  );
}
