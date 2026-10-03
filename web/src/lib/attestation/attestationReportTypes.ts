import type { AttestationComputedScores } from "@/lib/attestation/computeAttestationScores";
import type { RosenzweigCodingSummary } from "@/lib/attestation/rosenzweigCoding";

export type AttestationReportJson = {
  scores: AttestationComputedScores;
  /** Сводка кодирования Розенцвейга (если заполнено наблюдателем). */
  rosenzweigCodingSummary: RosenzweigCodingSummary | null;
  computedAt: string;
  /** Текст заключения ИИ для HRD / генерального директора. */
  conclusionText: string | null;
  /** Краткие управленческие шаги для HRD / CEO. */
  managerActions: string | null;
  conclusionGeneratedAt: string | null;
};
