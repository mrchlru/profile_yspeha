import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { generateOdReservePsychologicalStateAi } from "@/lib/ai/generateOdReservePsychologicalStateAi";
import { buildPsychologicalStateFallbackConclusion } from "@/lib/audit/report/buildPsychologicalStateFallbackConclusion";
import {
  buildPsychologicalStateSignals,
  OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX,
  type PsychologicalStateSignals,
} from "@/lib/audit/report/buildPsychologicalStateSignals";
import { sanitizeManagerBriefConclusionText } from "@/lib/audit/report/sanitizeManagerBriefConclusionText";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { managerBriefPsychologicalStateText } from "@/lib/audit/report/odReserveManagerBriefInterpretations";

export type ManagerBriefLineOverrides = Readonly<Partial<Record<number, string>>>;

/**
 * Пункт «Психологическое состояние» для отчёта руководителю: ИИ-синтез пяти показателей, при сбое — правила.
 */
export async function resolveOdReservePsychologicalStateHybrid(input: {
  answers: AuditAnswersMap;
  sessionRef: string;
  useAi: boolean;
}): Promise<string> {
  const signals = buildPsychologicalStateSignals(input.answers);
  if (signals.indicators.length === 0) {
    return "Недостаточно данных для краткого вывода.";
  }

  if (input.useAi) {
    const fromAi = await generateOdReservePsychologicalStateAi({
      answers: input.answers,
      sessionRef: input.sessionRef,
    });
    if (fromAi !== null && fromAi.length >= 40 && !_isReferencePhraseConcat(signals, fromAi)) {
      return fromAi;
    }
    screeningServerLog("openai_psych_state", "fallback_to_rules", {
      sessionRef: input.sessionRef,
      hadAi: fromAi !== null,
      rejectedConcat: fromAi !== null && _isReferencePhraseConcat(signals, fromAi),
    });
  }

  return sanitizeManagerBriefConclusionText(
    buildPsychologicalStateFallbackConclusion(signals)
  );
}

/** Синхронный текст для пересборки без OpenAI. */
export function resolveOdReservePsychologicalStateRules(
  answers: AuditAnswersMap
): string {
  const signals = buildPsychologicalStateSignals(answers);
  if (signals.indicators.length === 0) {
    return "Недостаточно данных для краткого вывода.";
  }
  return sanitizeManagerBriefConclusionText(
    buildPsychologicalStateFallbackConclusion(signals)
  );
}

/** Overrides только для пункта «Психологическое состояние». */
export function buildPsychologicalStateLineOverride(
  text: string
): ManagerBriefLineOverrides {
  return {
    [OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX]: text,
  };
}

export { OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX };

function _isReferencePhraseConcat(
  signals: PsychologicalStateSignals,
  text: string
): boolean {
  const phrases = signals.indicators.map((item) => item.referencePhrase.trim()).filter(Boolean);
  if (phrases.length < 3) {
    return false;
  }
  const concat = managerBriefPsychologicalStateText(phrases);
  const normalized = _normalizePsychText(text);
  if (normalized === _normalizePsychText(concat)) {
    return true;
  }
  const contained = phrases.filter((phrase) => normalized.includes(_normalizePsychText(phrase)));
  return contained.length >= 4;
}

function _normalizePsychText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
