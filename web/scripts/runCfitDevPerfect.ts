/**
 * DEV-прогон CFIT: 100 % верных ответов по ключу, отправка в `/api/audit/dev-submit`.
 *
 * Использование:
 *   AUDIT_BASE_URL=https://prolific-stillness-production-11ee.up.railway.app \
 *   AUDIT_ACCESS_CODE=WGM35K2JSL5Y \
 *   npx tsx scripts/runCfitDevPerfect.ts
 *
 * `AUDIT_DRY_RUN=1` — только локальная проверка скоринга, без HTTP.
 */

import { randomUUID } from "node:crypto";

import {
  cfitAdultIqFromRaw,
  cfitInterpretation,
  computeCfitTotals,
} from "../src/lib/audit/report/computeCfitTotals";
import {
  CFIT_ADULT_IQ_BY_RAW,
  CFIT_ADULT_IQ_MAX_RAW,
  CFIT_ANSWER_KEYS,
} from "../src/lib/audit/report/keys/auditScoringKeys";
import { buildDevAuditTextReport } from "../src/lib/audit/report/buildDevAuditTextReport";

type StepAnswers = Record<string, string>;
type AnswersMap = Record<string, StepAnswers>;

const CFIT_STEP_INDICES = [10, 11, 12, 13, 14, 15, 16, 17] as const;

function _envFlag(name: string): string | null {
  const raw = process.env[name];
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Собирает ответы CFIT: на каждое задание — цифра из `CFIT_ANSWER_KEYS`. */
export function buildPerfectCfitAnswers(): AnswersMap {
  const out: AnswersMap = {};
  for (let subtestIndex = 0; subtestIndex < CFIT_STEP_INDICES.length; subtestIndex += 1) {
    const stepIndex = CFIT_STEP_INDICES[subtestIndex]!;
    const key = CFIT_ANSWER_KEYS[subtestIndex] ?? [];
    const stepAnswers: StepAnswers = {};
    for (let questionIndex = 0; questionIndex < key.length; questionIndex += 1) {
      stepAnswers[`q${String(questionIndex + 1)}`] = key[questionIndex]!;
    }
    out[String(stepIndex)] = stepAnswers;
  }
  return out;
}

function _toNumericStepAnswers(answers: AnswersMap): Record<number, StepAnswers> {
  const out: Record<number, StepAnswers> = {};
  for (const [stepKey, stepAnswers] of Object.entries(answers)) {
    out[Number(stepKey)] = stepAnswers;
  }
  return out;
}

type CfitPerfectExpectation = {
  readonly scorableTotal: number;
  readonly correctTotal: number;
  readonly expectedIq: number | null;
};

/** Ожидаемый сырой балл и IQ при 100 % верных ответах. */
function _expectedPerfectCfit(): CfitPerfectExpectation {
  const scorableTotal = CFIT_ANSWER_KEYS.reduce((sum, key) => sum + key.length, 0);
  const correctTotal = scorableTotal;
  const expectedIq = cfitAdultIqFromRaw(correctTotal);
  return { scorableTotal, correctTotal, expectedIq };
}

/** Проверяет локальный скоринг и текст интерпретации. */
function _assertLocalScoring(answers: AnswersMap): void {
  const expectation = _expectedPerfectCfit();
  const totals = computeCfitTotals(_toNumericStepAnswers(answers));

  if (totals.scorableTotal !== expectation.scorableTotal) {
    throw new Error(
      `scorableTotal: ожидалось ${String(expectation.scorableTotal)}, получено ${String(totals.scorableTotal)}`
    );
  }
  if (totals.correctTotal !== expectation.correctTotal) {
    throw new Error(
      `correctTotal: ожидалось ${String(expectation.correctTotal)}, получено ${String(totals.correctTotal)}`
    );
  }
  if (totals.answeredTotal !== expectation.correctTotal) {
    throw new Error(
      `answeredTotal: ожидалось ${String(expectation.correctTotal)}, получено ${String(totals.answeredTotal)}`
    );
  }
  if (totals.iq !== expectation.expectedIq) {
    throw new Error(
      `IQ: ожидалось ${String(expectation.expectedIq)}, получено ${String(totals.iq)}`
    );
  }

  const interpretation = cfitInterpretation(totals);
  if (!interpretation.includes(`общий сырой балл - ${String(expectation.correctTotal)}`)) {
    throw new Error("Интерпретация не содержит ожидаемый сырой балл");
  }
  if (
    expectation.expectedIq !== null &&
    !interpretation.includes(`Стандартная оценка IQ: ${String(expectation.expectedIq)}`)
  ) {
    throw new Error(`Интерпретация не содержит IQ ${String(expectation.expectedIq)}`);
  }
  if (totals.correctTotal > 88 && !interpretation.includes("строка общей суммы 88")) {
    throw new Error("Интерпретация не поясняет потолок таблицы 88");
  }

  console.log("[runCfitDevPerfect] Локальная проверка OK:");
  console.log(`  заданий: ${String(totals.answeredTotal)}/${String(totals.scorableTotal)}`);
  console.log(`  сырой балл: ${String(totals.correctTotal)}`);
  console.log(`  IQ (18+): ${totals.iq !== null ? String(totals.iq) : "не определён"}`);
  if (totals.correctTotal >= CFIT_ADULT_IQ_MAX_RAW) {
    console.log(
      `  (сырой ≥ ${String(CFIT_ADULT_IQ_MAX_RAW)} → IQ по таблице для ${String(CFIT_ADULT_IQ_MAX_RAW)} = ${String(CFIT_ADULT_IQ_BY_RAW[CFIT_ADULT_IQ_MAX_RAW])})`
    );
  }
}

async function _submitDev(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<{ status: number; json: unknown; text: string }> {
  const res = await fetch(`${baseUrl}/api/audit/dev-submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function main(): Promise<void> {
  const baseUrl = (
    _envFlag("AUDIT_BASE_URL") ?? "https://prolific-stillness-production-11ee.up.railway.app"
  ).replace(/\/$/, "");
  const accessCode = _envFlag("AUDIT_ACCESS_CODE") ?? "WGM35K2JSL5Y";
  const firstName = _envFlag("AUDIT_FIRST_NAME") ?? "CFIT";
  const lastName = _envFlag("AUDIT_LAST_NAME") ?? "PerfectDev";
  const dryRun = _envFlag("AUDIT_DRY_RUN") === "1";

  const sessionId = randomUUID();
  const answers = buildPerfectCfitAnswers();
  const expectation = _expectedPerfectCfit();

  console.log(`[runCfitDevPerfect] base=${baseUrl}`);
  console.log(`[runCfitDevPerfect] accessCode=${accessCode}`);
  console.log(`[runCfitDevPerfect] sessionId=${sessionId}`);

  _assertLocalScoring(answers);

  const previewReport = buildDevAuditTextReport(_toNumericStepAnswers(answers), {
    fullName: `${lastName} ${firstName}`,
    sessionId,
    generatedAt: new Date().toISOString(),
  });
  console.log("\n--- Превью DEV-отчёта (фрагмент CFIT) ---");
  const cfitLines = previewReport
    .split("\n")
    .filter(
      (line) =>
        line.includes("CFIT") ||
        line.includes("сырой") ||
        line.includes("IQ") ||
        line.includes("Часть") ||
        line.includes("верных")
    );
  for (const line of cfitLines.slice(0, 20)) {
    console.log(line);
  }
  console.log("---\n");

  if (dryRun) {
    console.log("[runCfitDevPerfect] AUDIT_DRY_RUN=1 — на сервер не отправляю");
    return;
  }

  const validateRes = await fetch(`${baseUrl}/api/access/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: accessCode }),
  });
  const validateJson = (await validateRes.json()) as { testKind?: string; error?: string };
  if (!validateRes.ok || validateJson.testKind !== "state_audit_dev") {
    throw new Error(
      `Код не подходит для dev-submit: HTTP ${String(validateRes.status)} ${JSON.stringify(validateJson)}`
    );
  }

  const body = {
    accessCode,
    sessionId,
    firstName,
    lastName,
    personalDataConsent: true as const,
    consentRecordedAt: new Date().toISOString(),
    answers,
  };

  const startedAt = Date.now();
  const { status, json, text } = await _submitDev(baseUrl, body);
  const durationMs = Date.now() - startedAt;

  console.log(
    `[runCfitDevPerfect] /api/audit/dev-submit → HTTP ${String(status)} (${String(durationMs)} мс)`
  );

  if (status !== 200) {
    console.error(text);
    process.exit(1);
  }

  const response = json as { ok?: boolean; textReport?: string; emailSent?: boolean };
  if (response.textReport === undefined) {
    throw new Error("В ответе нет textReport");
  }

  const report = response.textReport;
  if (!report.includes(`общий сырой балл - ${String(expectation.correctTotal)}`)) {
    throw new Error("Серверный отчёт: неверный сырой балл");
  }
  if (
    expectation.expectedIq !== null &&
    !report.includes(`IQ (взрослые 18+): ${String(expectation.expectedIq)}`)
  ) {
    throw new Error(`Серверный отчёт: ожидался IQ ${String(expectation.expectedIq)}`);
  }
  if (expectation.correctTotal > 88 && !report.includes("общей суммы 88")) {
    throw new Error("Серверный отчёт: нет пояснения потолка таблицы 88");
  }

  console.log("[runCfitDevPerfect] Серверная проверка OK");
  console.log(`  emailSent=${String(response.emailSent ?? false)}`);
  console.log("\n--- Фрагмент серверного отчёта ---");
  for (const line of report.split("\n").filter((l) => l.includes("IQ") || l.includes("сырой") || l.includes("верных")).slice(0, 12)) {
    console.log(line);
  }
}

const _isMain =
  typeof process.argv[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").endsWith("runCfitDevPerfect.ts");

if (_isMain) {
  main().catch((err) => {
    console.error("[runCfitDevPerfect] FAILED", err);
    process.exit(1);
  });
}
