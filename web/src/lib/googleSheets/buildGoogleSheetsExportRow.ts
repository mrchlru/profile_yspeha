import type { AuditAnswersMap } from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import type { AuditInternalKey } from "@/lib/audit/auditTypes";
import {
  computeBurnoutScores,
} from "@/lib/audit/report/computeMbiStep19";
import {
  computeCfitTotals,
  type CfitTotals,
} from "@/lib/audit/report/computeCfitTotals";
import {
  computeGerchikovProfile,
  computeGoalPursuitScores,
  computeKosScores,
  computeRotterScores,
  computeRoweStyleScores,
  computeSchubertScores,
  computeStrelyauScores,
  computeThomasKilmannScores,
  computeTypeAScores,
  gerchikovGoogleSheetsExportLabel,
  thomasKilmannStyleLabel,
} from "@/lib/audit/report/computeAuditMethodologyScores";
import { computeMaslachMbiFromAuditStep } from "@/lib/audit/report/computeMaslachMbiFromAuditStep";
import { computeSectarianismEvaluation } from "@/lib/audit/report/computeSectarianismScores";
import { CFIT_ADULT_IQ_MIN_RAW } from "@/lib/audit/report/keys/auditScoringKeys";
import type { MaslachBurnoutScores } from "@/lib/burnout/computeMaslachBurnoutScores";
import type { GoogleSheetsSheetSchema } from "@/lib/googleSheets/googleSheetsSheetSchemas";
import { flattenGoogleSheetsColumnIds } from "@/lib/googleSheets/googleSheetsSheetSchemas";

export type GoogleSheetsCandidateMeta = {
  fullName: string;
  birthDate: string;
  submittedAt: string;
};

export type GoogleSheetsMetricValues = Record<string, string | number>;

/**
 * Собирает числовые метрики аудита для выгрузки в Google Sheets.
 */
export function buildGoogleSheetsAuditMetrics(
  answers: AuditAnswersMap,
  options: { includeSectarianism: boolean; includeManagementBattery: boolean }
): GoogleSheetsMetricValues {
  const values: GoogleSheetsMetricValues = {};

  const cfit = computeCfitTotals(answers);
  values.iq = _formatCfitExportValue(cfit);

  if (options.includeManagementBattery) {
    const kos = computeKosScores(_stepAnswers(answers, "kos_communicative_organizational"));
    if (kos.commLevel !== null && kos.orgLevel !== null) {
      values.kos = `${String(kos.commLevel)}/${String(kos.orgLevel)}`;
    }

    const rowe = computeRoweStyleScores(_stepAnswers(answers, "rowe_decision_styles"));
    if (rowe.dominantStyle !== null) {
      values.rowe = rowe.dominantStyle;
    }

    const goal = computeGoalPursuitScores(_stepAnswers(answers, "goal_pursuit_short"));
    if (goal.sum !== null) {
      values.goal = goal.sum;
    }

    const schubert = computeSchubertScores(_stepAnswers(answers, "schubert_risk_full"));
    if (schubert.sum !== null) {
      values.schubert = schubert.sum;
    }

    const typeA = computeTypeAScores(_stepAnswers(answers, "type_a_jenkins_short"));
    if (typeA.sum !== null) {
      values.type_a = typeA.sum;
    }

    const strelyau = computeStrelyauScores(_stepAnswers(answers, "strelyau_temperament_short"));
    if (strelyau.diff !== null) {
      values.strelyau = strelyau.diff;
    }

    const rotter = computeRotterScores(_stepAnswers(answers, "rotter_locus"));
    if (rotter.internal !== null && rotter.external !== null) {
      values.rotter = `${String(rotter.internal)}/${String(rotter.external)}`;
    }

    _applyMaslachMetrics(values, computeMaslachMbiFromAuditStep(
      _stepAnswers(answers, "maslach_mbi_short")
    ).scores);
  }

  const thomas = computeThomasKilmannScores(_stepAnswers(answers, "thomas_kilmann_conflict"));
  if (thomas.dominant !== null) {
    values.thomas = thomasKilmannStyleLabel(thomas.dominant);
  }

  const gerchikov = computeGerchikovProfile(_stepAnswers(answers, "gerchikov_motivation_full"));
  const gerchikovLabel = gerchikovGoogleSheetsExportLabel(gerchikov);
  if (gerchikovLabel !== null) {
    values.gerchikov = gerchikovLabel;
  }

  _applyRukavishnikovMetrics(
    values,
    computeBurnoutScores(_stepAnswers(answers, "maslach_burnout"))
  );

  if (options.includeSectarianism) {
    const sect = computeSectarianismEvaluation(_stepAnswers(answers, "sectarianism_screening"));
    for (const row of sect.hrProfileRows) {
      values[`sect_${row.profileId}`] = row.scorePercent;
    }
  }

  return values;
}

/** Метрики standalone-теста на выгорание (MBI). */
export function buildGoogleSheetsBurnoutMetrics(scores: MaslachBurnoutScores): GoogleSheetsMetricValues {
  const values: GoogleSheetsMetricValues = {};
  _applyMaslachMetrics(values, scores);
  return values;
}

/**
 * Собирает строку значений в порядке колонок схемы.
 */
export function buildGoogleSheetsDataRow(input: {
  schema: GoogleSheetsSheetSchema;
  sequenceNumber: number;
  candidate: GoogleSheetsCandidateMeta;
  metrics: GoogleSheetsMetricValues;
}): ReadonlyArray<string | number> {
  const columnIds = flattenGoogleSheetsColumnIds(input.schema);
  const row: Array<string | number> = [];
  for (const columnId of columnIds) {
    if (columnId === "seq") {
      row.push(input.sequenceNumber);
      continue;
    }
    if (columnId === "fullName") {
      row.push(input.candidate.fullName);
      continue;
    }
    if (columnId === "birthDate") {
      row.push(input.candidate.birthDate);
      continue;
    }
    if (columnId === "submittedAt") {
      row.push(input.candidate.submittedAt);
      continue;
    }
    const metric = input.metrics[columnId];
    row.push(metric === undefined || metric === null ? "" : metric);
  }
  return row;
}

function _stepAnswers(
  answers: AuditAnswersMap,
  internalKey: AuditInternalKey
): AuditAnswersMap[number] | undefined {
  const step = AUDIT_STEPS.find((entry) => entry.internalKey === internalKey);
  if (step === undefined) {
    return undefined;
  }
  return answers[step.stepIndex];
}

function _formatCfitExportValue(totals: CfitTotals): string | number {
  if (totals.iq !== null) {
    return totals.iq;
  }
  if (totals.correctTotal < CFIT_ADULT_IQ_MIN_RAW) {
    return totals.correctTotal;
  }
  return totals.correctTotal;
}

function _applyRukavishnikovMetrics(
  values: GoogleSheetsMetricValues,
  scores: ReturnType<typeof computeBurnoutScores>
): void {
  if (scores.pm !== null) {
    values.ruk_pm = scores.pm;
  }
  if (scores.pi !== null) {
    values.ruk_pi = scores.pi;
  }
  if (scores.lo !== null) {
    values.ruk_lo = scores.lo;
  }
  if (scores.ipv !== null) {
    values.ruk_ipv = scores.ipv;
  }
  if (scores.workerLoad !== null) {
    values.ruk_izr = scores.workerLoad;
  }
}

function _applyMaslachMetrics(
  values: GoogleSheetsMetricValues,
  scores: MaslachBurnoutScores
): void {
  if (scores.ee !== null) {
    values.mas_ee = scores.ee;
  }
  if (scores.dp !== null) {
    values.mas_dp = scores.dp;
  }
  if (scores.pa !== null) {
    values.mas_pa = scores.pa;
  }
}
