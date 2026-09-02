import type { MaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import type { MaslachBurnoutInterpretation } from "@/lib/burnout/maslachBurnoutInterpretation";

export type BurnoutReportJson = {
  scores: MaslachBurnoutScores;
  interpretation: MaslachBurnoutInterpretation | null;
  computedAt: string;
};
