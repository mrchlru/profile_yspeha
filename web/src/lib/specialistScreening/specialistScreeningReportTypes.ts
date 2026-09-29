import type { SpecialistScreeningScores } from "@/lib/specialistScreening/computeSpecialistScreeningScores";
import type { SpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";

export type SpecialistScreeningReportJson = {
  scores: SpecialistScreeningScores;
  interpretation: SpecialistScreeningInterpretation | null;
  computedAt: string;
};
