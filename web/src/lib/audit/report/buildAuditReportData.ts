import {
  getStepAnsweredCount,
  type AuditAnswersMap,
} from "@/lib/audit/auditAnswers";
import { AUDIT_STEPS } from "@/lib/audit/auditSteps";
import {
  AUDIT_REPORT_VERSION,
  AUDIT_YOY_METRIC_KEYS,
  type AuditReportJson,
  type AuditReportMetricDelta,
  type AuditReportMetrics,
  type AuditReportStepSummary,
  type AuditReportYoY,
} from "@/lib/audit/report/auditReportTypes";
import { computeCfitTotals } from "@/lib/audit/report/computeCfitTotals";
import { computeBurnoutScores } from "@/lib/audit/report/computeMbiStep19";
import { computeRoweStep01Summary } from "@/lib/audit/report/computeRoweStep01";
import { buildAuditTestBlocks } from "@/lib/audit/report/buildAuditTestBlocks";
import { buildAuditConclusionData } from "@/lib/audit/report/buildAuditConclusionData";
import { buildAuditManagerBrief } from "@/lib/audit/report/buildAuditManagerBrief";
import { resolveManagerBriefConclusion } from "@/lib/audit/report/resolveManagerBriefConclusion";
import { buildAuditNarrativeSections } from "@/lib/audit/report/buildAuditNarrativeSections";
import { formatMoscowDateTime, formatMoscowNow } from "@/lib/datetime/moscowTime";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";
import type { Step4Data } from "@/lib/step4/step4Types";
import { buildBurnoutPiAlertSummary } from "@/lib/burnout/burnoutPiCritical";

export type PreviousAuditSubmissionRow = {
  sessionId: string;
  createdAt: Date;
  auditReport: unknown;
};

/**
 * Достаёт плоские метрики из уже сохранённого JSON отчёта (для YoY).
 */
export function extractMetricsFromStoredAuditReport(json: unknown): AuditReportMetrics | null {
  if (json === null || typeof json !== "object") {
    return null;
  }
  const rec = json as { version?: unknown; metrics?: unknown };
  if (rec.version !== AUDIT_REPORT_VERSION) {
    return null;
  }
  if (rec.metrics === null || typeof rec.metrics !== "object") {
    return null;
  }
  return rec.metrics as AuditReportMetrics;
}

function buildMetricLabels(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, label } of AUDIT_YOY_METRIC_KEYS) {
    out[key] = label;
  }
  return out;
}

function buildStepSummaries(answers: AuditAnswersMap): ReadonlyArray<AuditReportStepSummary> {
  const list: AuditReportStepSummary[] = [];
  for (const step of AUDIT_STEPS) {
    const answered = getStepAnsweredCount(answers[step.stepIndex]);
    const totalHint =
      step.itemCount === null ? "динамический пул" : String(step.itemCount);
    let detail = "";
    if (step.stepIndex === 1) {
      const r = computeRoweStep01Summary(answers[1]);
      detail = `; закрыто пар ${String(r.pairsAnswered)}/${String(r.pairsTotal)}`;
    }
    if (step.internalKey === "maslach_burnout") {
      const b = computeBurnoutScores(answers[step.stepIndex]);
      if (b.pi !== null && b.lo !== null && b.pm !== null && b.ipv !== null) {
        detail = `; ПИ=${String(b.pi)} ЛО=${String(b.lo)} ПМ=${String(b.pm)} ИПВ=${String(b.ipv)} ИЗР=${String(b.workerLoad ?? "—")}`;
      }
    }
    list.push({
      stepIndex: step.stepIndex,
      slug: step.slug,
      internalKey: step.internalKey,
      summary: `Ответов с данными: ${String(answered)} из ${totalHint}${detail}`,
    });
  }
  return list;
}

function collectFlatMetrics(answers: AuditAnswersMap): AuditReportMetrics {
  const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const burnout = computeBurnoutScores(burnoutStep ? answers[burnoutStep.stepIndex] : undefined);
  const cfit = computeCfitTotals(answers);
  const rowe = computeRoweStep01Summary(answers[1]);
  return _collectFlatMetricsBody(burnout, cfit, rowe);
}

function _collectFlatMetricsBody(
  burnout: ReturnType<typeof computeBurnoutScores>,
  cfit: ReturnType<typeof computeCfitTotals>,
  rowe: ReturnType<typeof computeRoweStep01Summary>
): AuditReportMetrics {
  const metrics: AuditReportMetrics = {
    cfit_answered_total: cfit.answeredTotal,
    rowe_pairs_answered: rowe.pairsAnswered,
  };
  if (burnout.pi !== null) {
    metrics.burnout_pi_sum = burnout.pi;
  }
  if (burnout.lo !== null) {
    metrics.burnout_lo_sum = burnout.lo;
  }
  if (burnout.pm !== null) {
    metrics.burnout_pm_sum = burnout.pm;
  }
  if (burnout.ipv !== null) {
    metrics.burnout_ipv_sum = burnout.ipv;
  }
  if (burnout.workerLoad !== null) {
    metrics.burnout_worker_load = burnout.workerLoad;
  }
  return metrics;
}

function buildYearOverYearBlock(
  current: AuditReportMetrics,
  previous: PreviousAuditSubmissionRow | null
): AuditReportYoY | null {
  if (previous === null) {
    return null;
  }
  const beforeAll = extractMetricsFromStoredAuditReport(previous.auditReport);
  const deltas: AuditReportMetricDelta[] = [];
  for (const { key, label } of AUDIT_YOY_METRIC_KEYS) {
    const after = current[key];
    if (typeof after !== "number") {
      continue;
    }
    const before =
      beforeAll !== null && typeof beforeAll[key] === "number" ? beforeAll[key] : null;
    const delta = before === null ? null : after - before;
    deltas.push({ key, label, before, after, delta });
  }
  return {
    previousSessionId: previous.sessionId,
    previousCreatedAt: formatMoscowDateTime(previous.createdAt),
    deltas,
  };
}

type BuildAuditReportArgs = {
  answers: AuditAnswersMap;
  previous: PreviousAuditSubmissionRow | null;
  /** Черновой блок ИИ/доставки; после генерации перезаписывается в маршруте. */
  aiDraft: AuditReportJson["ai"];
  deliveryDraft: AuditReportJson["delivery"];
  /** Профиль отчёта: полный аудит или батарея ОД / резерва / ТУ. */
  reportProfile?: AuditReportProfile;
  /** Анкета ПРОФ СБ (step-4 скрининга) для батареи ТУ. */
  step4Data?: Step4Data;
};

/**
 * Собирает JSON отчёта аудита (без вызова OpenAI).
 */
export function buildAuditReportJson(input: BuildAuditReportArgs): AuditReportJson {
  const reportProfile = input.reportProfile ?? "full_state_audit";
  const metrics = collectFlatMetrics(input.answers);
  const burnoutStep = AUDIT_STEPS.find((s) => s.internalKey === "maslach_burnout");
  const burnoutScores = computeBurnoutScores(
    burnoutStep ? input.answers[burnoutStep.stepIndex] : undefined
  );
  const testBlocks = buildAuditTestBlocks(input.answers, reportProfile, input.step4Data);
  const narrativeSections = buildAuditNarrativeSections(
    input.answers,
    reportProfile,
    input.step4Data
  );
  const managerAiConclusion =
    input.aiDraft.structured?.managerBriefConclusion?.trim() || null;
  const managerConclusion = resolveManagerBriefConclusion(
    input.answers,
    reportProfile,
    managerAiConclusion
  );
  return {
    version: AUDIT_REPORT_VERSION,
    generatedAt: formatMoscowNow(),
    reportProfile,
    metrics,
    metricLabels: buildMetricLabels(),
    stepSummaries: buildStepSummaries(input.answers),
    testBlocks,
    narrativeSections,
    conclusion: buildAuditConclusionData(input.answers),
    burnoutPiAlert: buildBurnoutPiAlertSummary(burnoutScores),
    yoy: buildYearOverYearBlock(metrics, input.previous),
    ai: input.aiDraft,
    managerBrief: buildAuditManagerBrief(
      testBlocks,
      narrativeSections,
      managerConclusion,
      burnoutScores,
      input.answers,
      reportProfile
    ),
    delivery: input.deliveryDraft,
  };
}
