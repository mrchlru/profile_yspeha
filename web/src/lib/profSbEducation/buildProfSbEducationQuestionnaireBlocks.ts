import {
  buildStep4ReportSections,
  type Step4ReportSection,
} from "@/lib/step4/step4Labels";
import type { Step4Data } from "@/lib/step4/step4Types";

/** Разделы step-4, относящиеся к блоку «ПРОФ образование». */
const PROF_EDUCATION_SECTION_TITLES = new Set([
  "Образование",
  "Курсы переподготовки и повышения квалификации",
  "Заключение по образованию и обучению",
]);

export type ProfSbEducationQuestionnaireBlock = {
  title: string;
  sections: ReadonlyArray<Step4ReportSection>;
};

/**
 * Делит анкету step-4 на два блока отчёта: ПРОФ СБ и ПРОФ образование.
 */
export function buildProfSbEducationQuestionnaireBlocks(
  step4: Step4Data | null | undefined
): ReadonlyArray<ProfSbEducationQuestionnaireBlock> {
  if (!step4) {
    return [
      { title: "Анкета ПРОФ СБ", sections: [] },
      { title: "ПРОФ образование", sections: [] },
    ];
  }

  const all = buildStep4ReportSections(step4);
  const education = all.filter((section) => PROF_EDUCATION_SECTION_TITLES.has(section.title));
  const profSb = all.filter((section) => !PROF_EDUCATION_SECTION_TITLES.has(section.title));

  return [
    { title: "Анкета ПРОФ СБ", sections: profSb },
    { title: "ПРОФ образование", sections: education },
  ];
}

/**
 * Достаёт Step4Data из сохранённых answers ПРОФ (standalone или screening_step4).
 */
export function extractStep4DataFromProfAnswers(answers: unknown): Step4Data | null {
  if (!answers || typeof answers !== "object") {
    return null;
  }
  const root = answers as { step4Data?: unknown };
  if (root.step4Data && typeof root.step4Data === "object") {
    return root.step4Data as Step4Data;
  }
  return null;
}
