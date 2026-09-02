/**
 * Скрипт «авто-прохождения» аудита состояния.
 *
 * Принимает существующий код доступа (или сам выпускает новый через
 * `/api/admin/access-invite`), генерирует случайные валидные ответы для всех
 * 24 шагов аудита и отправляет их одним POST-запросом в `/api/audit/submit` —
 * это запускает обычный пайплайн: ИИ-заключение → PDF → письмо HR.
 *
 * Использование:
 *   AUDIT_BASE_URL=https://example.com \
 *   AUDIT_ACCESS_CODE=XXXXXXXX \
 *   AUDIT_FIRST_NAME="Иван" AUDIT_LAST_NAME="Автотестов" \
 *   npx tsx scripts/autoFillAudit.ts
 *
 * Если `AUDIT_ACCESS_CODE` не задан, скрипт сам попросит admin-эндпоинт
 * выпустить свежий код (нужны `ADMIN_PANEL_EMAIL` и `ADMIN_PANEL_PASSWORD`).
 * `state_audit_dev` (многоразовый dev-код), но можно передать
 * `AUDIT_INVITE_KIND=state_audit` для «продового» одноразового кода.
 *
 * Для воспроизводимости можно зафиксировать сид: `AUDIT_RANDOM_SEED=42`.
 *
 * CFIT (шаги 10–15): ответы подбираются по ключу так, чтобы сырой балл попадал
 * в таблицу норм и IQ всегда определялся. По умолчанию целевой сырой балл
 * случаен (21–68); можно задать `AUDIT_CFIT_TARGET_RAW` или `AUDIT_CFIT_TARGET_IQ`.
 *
 * Каждый запуск возвращает новый `sessionId`, поэтому `auditSubmission`
 * пишется как новая запись и блок «динамика год-к-году» в письме считается
 * относительно предыдущей попытки с тем же `firstName` + `lastName`.
 *
 * Для проверки генератора без живого API можно прогнать в режиме
 * `AUDIT_DRY_RUN=1` — скрипт сгенерирует ответы и покажет сводку, но
 * никуда их не отправит и не будет требовать код доступа.
 */

import { randomUUID } from "node:crypto";

import { AUDIT_STEPS } from "../src/lib/audit/auditSteps";
import type { AuditStepConfig } from "../src/lib/audit/auditTypes";
import { AUDIT_STEP_01_PAIRS } from "../src/lib/audit/questions/step01Pairs";
import { AUDIT_STEP_02_QUESTIONS } from "../src/lib/audit/questions/step02Mcq";
import { AUDIT_STEP_26_QUESTIONS } from "../src/lib/audit/questions/step26Sectarianism";
import {
  AUDIT_STEP_03_OPTIONS,
  AUDIT_STEP_03_QUESTIONS,
} from "../src/lib/audit/questions/step03Likert4";
import { AUDIT_STEP_04_QUESTIONS } from "../src/lib/audit/questions/step04TrueFalse";
import {
  AUDIT_STEP_05_OPTIONS,
  AUDIT_STEP_05_QUESTIONS,
} from "../src/lib/audit/questions/step05Likert5";
import { AUDIT_STEP_06_QUESTIONS } from "../src/lib/audit/questions/step06YesNoUnknown";
import { AUDIT_STEP_07_QUESTIONS } from "../src/lib/audit/questions/step07YesNo";
import { AUDIT_STEP_08_PAIRS } from "../src/lib/audit/questions/step08Pairs";
import {
  AUDIT_STEP_09_OPTIONS,
  AUDIT_STEP_09_QUESTIONS,
} from "../src/lib/audit/questions/step09Likert7";
import { AUDIT_STEP_18_PAIRS } from "../src/lib/audit/questions/step18KeirseyPairs";
import {
  AUDIT_STEP_19_ITEMS,
  AUDIT_STEP_19_OPTIONS,
} from "../src/lib/audit/questions/step19Maslach";
import { AUDIT_STEP_20_PAIRS } from "../src/lib/audit/questions/step20Pairs";
import { AUDIT_STEP_21_QUESTIONS } from "../src/lib/audit/questions/step21Gerchikov";
import {
  AUDIT_STEP_22_OPTIONS,
  AUDIT_STEP_22_QUESTIONS,
} from "../src/lib/audit/questions/step22Likert11";
import { AUDIT_STEP_23_QUESTIONS } from "../src/lib/audit/questions/step23YesNo";
import { AUDIT_STEP_24_QUESTIONS } from "../src/lib/audit/questions/step24Erudition";
import {
  MASLACH_BURNOUT_OPTIONS,
  MASLACH_BURNOUT_QUESTIONS,
} from "../src/lib/burnout/maslachBurnoutQuestions";
import {
  cfitAdultIqFromRaw,
  computeCfitTotals,
} from "../src/lib/audit/report/computeCfitTotals";
import {
  CFIT_ADULT_IQ_BY_RAW,
  CFIT_ADULT_IQ_MAX_RAW,
  CFIT_ADULT_IQ_MIN_RAW,
  CFIT_ANSWER_KEYS,
} from "../src/lib/audit/report/keys/auditScoringKeys";

type AnswerValue = string | number | string[] | null;
type StepAnswers = Record<string, AnswerValue>;
type AnswersMap = Record<string, StepAnswers>;

type Rng = () => number;

const CFIT_DIGITS = ["1", "2", "3", "4", "5"] as const;
const CFIT_STEP_INDICES = [10, 11, 12, 13, 14, 15, 16, 17] as const;
/** В аудите 92 задания CFIT — больше верных ответить нельзя. */
const CFIT_SCORABLE_TOTAL = CFIT_ANSWER_KEYS.reduce(
  (sum, key) => sum + key.length,
  0
);
const CFIT_TARGET_RAW_MAX = Math.min(CFIT_ADULT_IQ_MAX_RAW, CFIT_SCORABLE_TOTAL);

type CfitGenerationPlan = {
  targetRaw: number;
  expectedIq: number | null;
};

function _envFlag(name: string): string | null {
  const raw = process.env[name];
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Очень простой детерминированный ГПСЧ (xmur3 + mulberry32). */
export function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: ReadonlyArray<T>, rng: Rng): T {
  if (arr.length === 0) {
    throw new Error("Cannot pick from an empty array");
  }
  return arr[Math.floor(rng() * arr.length)]!;
}

function pickN<T>(arr: ReadonlyArray<T>, n: number, rng: Rng): T[] {
  const copy = arr.slice();
  const out: T[] = [];
  const limit = Math.min(n, copy.length);
  for (let i = 0; i < limit; i += 1) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

function randomInt(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Универсальный генератор ответа «один из вариантов» по любому списку,
 * у которого у элементов есть поле `id`.
 */
function pickOptionId<T extends { id: string | number }>(
  options: ReadonlyArray<T>,
  rng: Rng
): T["id"] {
  return pick(options, rng).id;
}

function generatePairAnswers(
  pairs: ReadonlyArray<{ index: number }>,
  rng: Rng
): StepAnswers {
  const out: StepAnswers = {};
  for (const pair of pairs) {
    out[`q${String(pair.index)}`] = rng() < 0.5 ? "a" : "b";
  }
  return out;
}

function generateMcqAnswers(
  questions: ReadonlyArray<{
    index: number;
    options: ReadonlyArray<{ id: string }>;
  }>,
  rng: Rng
): StepAnswers {
  const out: StepAnswers = {};
  for (const q of questions) {
    out[`q${String(q.index)}`] = pickOptionId(q.options, rng);
  }
  return out;
}

function generateLikertAnswers<TId extends string | number>(
  questions: ReadonlyArray<{ index: number }>,
  options: ReadonlyArray<{ id: TId }>,
  rng: Rng
): StepAnswers {
  const out: StepAnswers = {};
  for (const q of questions) {
    out[`q${String(q.index)}`] = pickOptionId(options, rng);
  }
  return out;
}

function generateTrueFalseAnswers(
  questions: ReadonlyArray<{ index: number }>,
  rng: Rng
): StepAnswers {
  const out: StepAnswers = {};
  for (const q of questions) {
    out[`q${String(q.index)}`] = rng() < 0.5 ? "true" : "false";
  }
  return out;
}

function generateYesNoAnswers(
  questions: ReadonlyArray<{ index: number }>,
  rng: Rng
): StepAnswers {
  const out: StepAnswers = {};
  for (const q of questions) {
    out[`q${String(q.index)}`] = rng() < 0.5 ? "yes" : "no";
  }
  return out;
}

function generateYesNoUnknownAnswers(
  questions: ReadonlyArray<{ index: number }>,
  rng: Rng
): StepAnswers {
  const out: StepAnswers = {};
  const choices = ["yes", "no", "unknown"] as const;
  for (const q of questions) {
    out[`q${String(q.index)}`] = pick(choices, rng);
  }
  return out;
}

/** Перемешивает индексы 0..count-1 (Фишер–Йетс). */
function shuffleIndices(count: number, rng: Rng): number[] {
  const indices = Array.from({ length: count }, (_, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices;
}

/** Случайный неверный вариант CFIT (не совпадает с ключом). */
function pickWrongCfitDigit(
  correct: (typeof CFIT_DIGITS)[number],
  rng: Rng
): (typeof CFIT_DIGITS)[number] {
  const wrong = CFIT_DIGITS.filter((digit) => digit !== correct);
  return pick(wrong, rng);
}

/**
 * Выбирает целевой сырой балл CFIT: из env или случайно в допустимом диапазоне.
 * Сырой балл 21+ нужен, чтобы IQ попал в таблицу норм для взрослых.
 */
function resolveCfitTargetRaw(rng: Rng): number {
  const rawEnv = _envFlag("AUDIT_CFIT_TARGET_RAW");
  if (rawEnv !== null && /^\d+$/.test(rawEnv)) {
    const raw = Number(rawEnv);
    return Math.min(CFIT_TARGET_RAW_MAX, Math.max(CFIT_ADULT_IQ_MIN_RAW, raw));
  }
  const iqEnv = _envFlag("AUDIT_CFIT_TARGET_IQ");
  if (iqEnv !== null && /^\d+$/.test(iqEnv)) {
    const targetIq = Number(iqEnv);
    const matchingRaws = Object.entries(CFIT_ADULT_IQ_BY_RAW)
      .map(([raw, iq]) => ({ raw: Number(raw), iq }))
      .filter((entry) => entry.iq === targetIq)
      .map((entry) => entry.raw)
      .filter((raw) => raw <= CFIT_TARGET_RAW_MAX);
    if (matchingRaws.length > 0) {
      return pick(matchingRaws, rng);
    }
  }
  return randomInt(CFIT_ADULT_IQ_MIN_RAW, CFIT_TARGET_RAW_MAX, rng);
}

/**
 * Генерирует ответы CFIT по ключу: случайно выбирает, какие задания «верные»,
 * чтобы суммарный сырой балл совпал с целевым и IQ всегда определялся.
 */
function generateCfitAnswersForAllSubtests(rng: Rng): {
  byStep: Record<number, StepAnswers>;
  plan: CfitGenerationPlan;
} {
  const targetRaw = resolveCfitTargetRaw(rng);
  const expectedIq = cfitAdultIqFromRaw(targetRaw);

  type CfitSlot = {
    stepIndex: number;
    questionIndex: number;
    correct: (typeof CFIT_DIGITS)[number];
  };
  const slots: CfitSlot[] = [];
  for (let subtestIndex = 0; subtestIndex < CFIT_STEP_INDICES.length; subtestIndex += 1) {
    const stepIndex = CFIT_STEP_INDICES[subtestIndex]!;
    const key = CFIT_ANSWER_KEYS[subtestIndex] ?? [];
    for (let questionIndex = 0; questionIndex < key.length; questionIndex += 1) {
      slots.push({
        stepIndex,
        questionIndex: questionIndex + 1,
        correct: key[questionIndex]!,
      });
    }
  }

  const correctIndices = new Set(
    shuffleIndices(slots.length, rng).slice(0, targetRaw)
  );
  const byStep: Record<number, StepAnswers> = {};
  for (const stepIndex of CFIT_STEP_INDICES) {
    byStep[stepIndex] = {};
  }

  slots.forEach((slot, flatIndex) => {
    const answer = correctIndices.has(flatIndex)
      ? slot.correct
      : pickWrongCfitDigit(slot.correct, rng);
    byStep[slot.stepIndex]![`q${String(slot.questionIndex)}`] = answer;
  });

  return { byStep, plan: { targetRaw, expectedIq } };
}

/** Валидные ответы теста Герчикова (16 пунктов) — для скрининга и превью PDF. */
export function generateGerchikovAnswers(rng: Rng): StepAnswers {
  const out: StepAnswers = {};
  let q1Value: string | null = null;
  for (const q of AUDIT_STEP_21_QUESTIONS) {
    out[q.id] = _generateOneGerchikovAnswer(q, q1Value, rng);
    if (q.id === "q1" && typeof out[q.id] === "string") {
      q1Value = out[q.id] as string;
    }
  }
  return out;
}

function _generateOneGerchikovAnswer(
  q: (typeof AUDIT_STEP_21_QUESTIONS)[number],
  q1Value: string | null,
  rng: Rng
): AnswerValue {
  switch (q.kind) {
    case "passport_single":
    case "single":
      return pickOptionId(q.options, rng) as string;
    case "passport_number":
      return String(randomInt(22, 60, rng));
    case "passport_tenure":
      return [String(randomInt(0, 25, rng)), String(randomInt(0, 11, rng))];
    case "multi_one_or_two": {
      const ids = q.options.map((o) => o.id);
      const n = randomInt(1, 2, rng);
      return pickN(ids, n, rng);
    }
    case "multi_any": {
      const ids = q.options.map((o) => o.id);
      const n = randomInt(1, Math.min(3, ids.length), rng);
      return pickN(ids, n, rng);
    }
    case "matrix_importance": {
      const colIds = q.columns.map((c) => c.id);
      return q.rows.map(() => pick(colIds, rng));
    }
    case "branched_18": {
      const isManager = q1Value === q.managerOptionId;
      const opts = isManager ? q.managerOptions : q.nonManagerOptions;
      const ids = opts.map((o) => o.id);
      const n = randomInt(1, Math.min(2, ids.length), rng);
      return pickN(ids, n, rng);
    }
  }
}

function buildStepAnswers(step: AuditStepConfig, rng: Rng): StepAnswers {
  switch (step.internalKey) {
    case "rowe_decision_styles":
      return generatePairAnswers(AUDIT_STEP_01_PAIRS, rng);
    case "goal_pursuit_short":
      return generateMcqAnswers(AUDIT_STEP_02_QUESTIONS, rng);
    case "paperwork_style_short":
      return generateLikertAnswers(
        AUDIT_STEP_03_QUESTIONS,
        AUDIT_STEP_03_OPTIONS,
        rng
      );
    case "snyder_self_monitoring":
      return generateTrueFalseAnswers(AUDIT_STEP_04_QUESTIONS, rng);
    case "schubert_risk_full":
      return generateLikertAnswers(
        AUDIT_STEP_05_QUESTIONS,
        AUDIT_STEP_05_OPTIONS,
        rng
      );
    case "type_a_jenkins_short":
      return generateYesNoUnknownAnswers(AUDIT_STEP_06_QUESTIONS, rng);
    case "strelyau_temperament_short":
      return generateYesNoAnswers(AUDIT_STEP_07_QUESTIONS, rng);
    case "rotter_locus":
      return generatePairAnswers(AUDIT_STEP_08_PAIRS, rng);
    case "tolerance_likert7_33":
      return generateLikertAnswers(
        AUDIT_STEP_09_QUESTIONS,
        AUDIT_STEP_09_OPTIONS,
        rng
      );
    case "keirsey_temperament":
      return generatePairAnswers(AUDIT_STEP_18_PAIRS, rng);
    case "maslach_burnout":
      return generateLikertAnswers(
        AUDIT_STEP_19_ITEMS,
        AUDIT_STEP_19_OPTIONS,
        rng
      );
    case "thomas_kilmann_conflict":
      return generatePairAnswers(AUDIT_STEP_20_PAIRS, rng);
    case "gerchikov_motivation_full":
      return generateGerchikovAnswers(rng);
    case "pochebut_loyalty":
      return generateLikertAnswers(
        AUDIT_STEP_22_QUESTIONS,
        AUDIT_STEP_22_OPTIONS,
        rng
      );
    case "kos_communicative_organizational":
      return generateYesNoAnswers(AUDIT_STEP_23_QUESTIONS, rng);
    case "general_erudition_pool":
      return generateMcqAnswers(AUDIT_STEP_24_QUESTIONS, rng);
    case "maslach_mbi_short":
      return generateLikertAnswers(MASLACH_BURNOUT_QUESTIONS, MASLACH_BURNOUT_OPTIONS, rng);
    case "sectarianism_screening":
      return generateMcqAnswers(AUDIT_STEP_26_QUESTIONS, rng);
    case "cfit_subtest_1":
    case "cfit_subtest_2":
    case "cfit_subtest_3":
    case "cfit_subtest_4":
    case "cfit_subtest_5":
    case "cfit_subtest_6":
    case "cfit_subtest_7":
    case "cfit_subtest_8":
      throw new Error(
        `CFIT (${step.internalKey}) обрабатывается в generateCfitAnswersForAllSubtests`
      );
  }
}

async function _adminSessionCookie(baseUrl: string): Promise<string | null> {
  const email = _envFlag("ADMIN_PANEL_EMAIL");
  const password = _envFlag("ADMIN_PANEL_PASSWORD");
  if (email === null || password === null) {
    return null;
  }
  const res = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Не удалось войти в админ-панель: HTTP ${String(res.status)} ${text}`);
  }
  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter((v): v is string => v !== null);
  const sessionPair = setCookies
    .map((line) => line.split(";")[0]?.trim())
    .find((line) => line?.startsWith("drives_admin_session="));
  return sessionPair ?? null;
}

async function ensureAccessCode(baseUrl: string): Promise<string> {
  const explicit = _envFlag("AUDIT_ACCESS_CODE");
  if (explicit !== null) {
    return explicit;
  }
  const sessionCookie = await _adminSessionCookie(baseUrl);
  if (sessionCookie === null) {
    throw new Error(
      "Не задан ни AUDIT_ACCESS_CODE, ни пара ADMIN_PANEL_EMAIL + ADMIN_PANEL_PASSWORD"
    );
  }
  const testKind = _envFlag("AUDIT_INVITE_KIND") ?? "state_audit_dev";
  const res = await fetch(`${baseUrl}/api/admin/access-invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ testKind }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Не удалось получить код доступа: HTTP ${String(res.status)} ${text}`
    );
  }
  const parsed = JSON.parse(text) as { code?: unknown };
  if (typeof parsed.code !== "string" || parsed.code.length === 0) {
    throw new Error(`В ответе admin-эндпоинта нет поля code: ${text}`);
  }
  return parsed.code;
}

export function buildAnswersForAllSteps(rng: Rng): {
  answers: AnswersMap;
  cfitPlan: CfitGenerationPlan;
} {
  const cfit = generateCfitAnswersForAllSubtests(rng);
  const out: AnswersMap = {};
  for (const step of AUDIT_STEPS) {
    if (step.internalKey.startsWith("cfit_subtest_")) {
      out[String(step.stepIndex)] = cfit.byStep[step.stepIndex] ?? {};
    } else {
      out[String(step.stepIndex)] = buildStepAnswers(step, rng);
    }
  }
  return { answers: out, cfitPlan: cfit.plan };
}

/** Приводит ответы к числовым ключам шагов для подсчёта CFIT. */
function toNumericStepAnswers(answers: AnswersMap): Record<number, StepAnswers> {
  const out: Record<number, StepAnswers> = {};
  for (const [stepKey, stepAnswers] of Object.entries(answers)) {
    out[Number(stepKey)] = stepAnswers;
  }
  return out;
}

async function submitAudit(
  baseUrl: string,
  body: unknown
): Promise<{ status: number; bodyText: string }> {
  const res = await fetch(`${baseUrl}/api/audit/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const bodyText = await res.text();
  return { status: res.status, bodyText };
}

async function main(): Promise<void> {
  const baseUrl = (
    _envFlag("AUDIT_BASE_URL") ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const firstName = _envFlag("AUDIT_FIRST_NAME") ?? "Иван";
  const lastName = _envFlag("AUDIT_LAST_NAME") ?? "Автотестов";

  const seedEnv = _envFlag("AUDIT_RANDOM_SEED");
  const seed =
    seedEnv !== null && /^-?\d+$/.test(seedEnv)
      ? Number(seedEnv)
      : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const rng = makeRng(seed);

  const dryRun = _envFlag("AUDIT_DRY_RUN") === "1";

  console.log(`[autoFillAudit] base=${baseUrl}`);
  console.log(`[autoFillAudit] участник: ${lastName} ${firstName}`);
  console.log(`[autoFillAudit] seed=${String(seed)}`);
  if (dryRun) {
    console.log("[autoFillAudit] AUDIT_DRY_RUN=1 — отправлять не буду");
  }

  const sessionId = randomUUID();
  const { answers, cfitPlan } = buildAnswersForAllSteps(rng);
  const cfitTotals = computeCfitTotals(toNumericStepAnswers(answers));
  const totalAnswers = Object.values(answers).reduce(
    (sum, step) => sum + Object.keys(step).length,
    0
  );
  console.log(
    `[autoFillAudit] sessionId=${sessionId} шагов=${String(
      AUDIT_STEPS.length
    )} ответов=${String(totalAnswers)}`
  );
  console.log(
    `[autoFillAudit] CFIT: целевой сырой=${String(cfitPlan.targetRaw)} → ` +
      `фактический=${String(cfitTotals.correctTotal)}, ` +
      `IQ=${cfitTotals.iq !== null ? String(cfitTotals.iq) : "не определён"}`
  );

  if (dryRun) {
    for (const step of AUDIT_STEPS) {
      const stepAnswers = answers[String(step.stepIndex)] ?? {};
      console.log(
        `  step ${String(step.stepIndex).padStart(2, "0")} (${
          step.internalKey
        }): ${String(Object.keys(stepAnswers).length)} ответов`
      );
    }
    return;
  }

  const accessCode = await ensureAccessCode(baseUrl);
  console.log(`[autoFillAudit] accessCode=${accessCode}`);

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
  const { status, bodyText } = await submitAudit(baseUrl, body);
  const durationMs = Date.now() - startedAt;

  console.log(
    `[autoFillAudit] /api/audit/submit → HTTP ${String(status)} (${String(
      durationMs
    )} мс)`
  );
  console.log(bodyText);

  if (status !== 200) {
    process.exit(1);
  }
}

const _isAutoFillMain =
  typeof process.argv[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").endsWith("autoFillAudit.ts");

if (_isAutoFillMain) {
  main().catch((err) => {
    console.error("[autoFillAudit] FAILED", err);
    process.exit(1);
  });
}
