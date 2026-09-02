import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import { computeBurnoutScores } from "@/lib/audit/report/computeMbiStep19";
import type { RukavishnikovBandLevel } from "@/lib/audit/report/keys/auditScoringKeys";
import {
  listPsychologicalStateIndicatorParts,
  type ManagerBriefDocBand,
  type PsychStateIndicatorKey,
  type PsychStateIndicatorPart,
} from "@/lib/audit/report/odReserveManagerBriefInterpretations";

/** Индекс секции «Психологическое состояние» в отчёте для руководителя (ОД / ТУ). */
export const OD_RESERVE_PSYCHOLOGICAL_STATE_SECTION_INDEX = 5;

export type PsychStateSeverity = "favorable" | "neutral" | "unfavorable" | "critical";

/** Сигнал одного из пяти показателей психологического состояния. */
export type PsychologicalStateIndicatorSignal = PsychStateIndicatorPart & {
  severity: PsychStateSeverity;
};

export type PsychologicalStateSignals = {
  indicators: ReadonlyArray<PsychologicalStateIndicatorSignal>;
  complete: boolean;
};

/**
 * Собирает пять показателей психологического состояния (ПИ, ЛО, ПМ, ИПВ, нагрузка)
 * для синтеза текста в отчёте руководителю.
 */
export function buildPsychologicalStateSignals(
  answers: AuditAnswersMap
): PsychologicalStateSignals {
  const step = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const scores = computeBurnoutScores(step ? answers[step.stepIndex] : undefined);

  if (
    scores.piBand === null &&
    scores.loBand === null &&
    scores.pmBand === null &&
    scores.ipvBand === null &&
    scores.workerLoadBand === null
  ) {
    return { indicators: [], complete: false };
  }

  const parts = listPsychologicalStateIndicatorParts({
    pi: scores.piBand ? _rukBandToDoc(scores.piBand) : null,
    lo: scores.loBand ? _rukBandToDoc(scores.loBand) : null,
    pm: scores.pmBand ? _rukBandToDoc(scores.pmBand) : null,
    ipv: scores.ipvBand ? _rukBandToDoc(scores.ipvBand) : null,
    load: scores.workerLoadBand ? _loadBandToDoc(scores.workerLoadBand) : null,
  });

  const indicators = parts.map((part) => ({
    ...part,
    severity: _resolveSeverity(part.key, part.docBand),
  }));

  return {
    indicators,
    complete: scores.answeredCount >= scores.totalItems,
  };
}

function _rukBandToDoc(band: RukavishnikovBandLevel): ManagerBriefDocBand {
  if (band === "extremely_low" || band === "low") {
    return "low";
  }
  if (band === "mid") {
    return "mid";
  }
  if (band === "high") {
    return "high";
  }
  return "extreme";
}

function _loadBandToDoc(
  band: RukavishnikovBandLevel
): "low" | "normal" | "high" | "critical" {
  if (band === "extremely_low" || band === "low") {
    return "low";
  }
  if (band === "mid") {
    return "normal";
  }
  if (band === "high") {
    return "high";
  }
  return "critical";
}

function _resolveSeverity(
  key: PsychStateIndicatorKey,
  docBand: ManagerBriefDocBand | "low" | "normal" | "high" | "critical"
): PsychStateSeverity {
  if (key === "pm") {
    if (docBand === "low") {
      return "unfavorable";
    }
    if (docBand === "mid") {
      return "neutral";
    }
    if (docBand === "high") {
      return "favorable";
    }
    return "favorable";
  }

  if (key === "load") {
    if (docBand === "low" || docBand === "normal") {
      return "neutral";
    }
    if (docBand === "high") {
      return "unfavorable";
    }
    return "critical";
  }

  if (docBand === "low") {
    return "favorable";
  }
  if (docBand === "mid") {
    return "neutral";
  }
  if (docBand === "high") {
    return "unfavorable";
  }
  return "critical";
}
