import type { AttestationComputedScores } from "@/lib/attestation/computeAttestationScores";
import type { RosenzweigCodingSummary } from "@/lib/attestation/rosenzweigCoding";

/** Кто последний раз записал кодирование Розенцвейга. */
export type RosenzweigCodingSource = "ai" | "manual";

export type RosenzweigCodingMeta = {
  source: RosenzweigCodingSource;
  generatedAt: string | null;
};

export type AttestationReportJson = {
  scores: AttestationComputedScores;
  /** Сводка кодирования Розенцвейга (ИИ и/или наблюдатель). */
  rosenzweigCodingSummary: RosenzweigCodingSummary | null;
  /** Метаданные источника кодирования (ИИ / ручная правка). */
  rosenzweigCodingMeta?: RosenzweigCodingMeta | null;
  computedAt: string;
  /** Текст заключения ИИ для HRD / генерального директора. */
  conclusionText: string | null;
  /** Краткие управленческие шаги для HRD / CEO. */
  managerActions: string | null;
  conclusionGeneratedAt: string | null;
};
