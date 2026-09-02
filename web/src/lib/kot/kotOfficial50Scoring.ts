import type { KotQuestionKey } from "@/lib/kot/step1Types";

/**
 * Проверка ответов по ключу из учебного пособия (Пашукова и др., 1996).
 * Допускаются эквивалентные формы записи (запятая/точка, регистр, пробелы).
 */

/** Интерпретация Ип по методичке (интегральный показатель = число верных). */
export const KOT_IP_LEVELS: readonly {
  readonly maxIp: number | null;
  readonly minIp: number;
  readonly label: string;
}[] = [
  { minIp: 0, maxIp: 13, label: "низкий" },
  { minIp: 14, maxIp: 18, label: "ниже среднего" },
  { minIp: 19, maxIp: 24, label: "средний" },
  { minIp: 25, maxIp: 29, label: "выше среднего" },
  { minIp: 30, maxIp: null, label: "высокий" },
];

export function describeKotIpLevel(ip: number): string {
  const n = Math.max(0, Math.min(50, Math.round(ip)));
  for (const row of KOT_IP_LEVELS) {
    if (row.maxIp === null) {
      if (n >= row.minIp) {
        return row.label;
      }
      continue;
    }
    if (n >= row.minIp && n <= row.maxIp) {
      return row.label;
    }
  }
  return KOT_IP_LEVELS[KOT_IP_LEVELS.length - 1]?.label ?? "средний";
}

export const KOT_IP_NORM_NOTE =
  "Интерпретация по методичке (Пашукова и др., 1996): интегральный показатель Ип равен числу правильно решённых задач из 50. Уровни: 13 и меньше — низкий; 14–18 — ниже среднего; 19–24 — средний; 25–29 — выше среднего; 30 и больше — высокий.";

function normalizeCore(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
}

function parseNumberLoose(s: string): number | null {
  const t = normalizeCore(s).replace(/,/g, ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Списки вида «1,2,4» / «4, 1, 2» — сортируем части как числа, если возможно. */
function normalizeCommaList(s: string): string {
  const parts = normalizeCore(s)
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const nums = parts.map((p) => parseNumberLoose(p));
  if (nums.every((x) => x !== null)) {
    return nums
      .map((x) => x as number)
      .sort((a, b) => a - b)
      .join(",");
  }
  return parts.sort().join(",");
}

function normalizeDashRange(s: string): string {
  return normalizeCore(s)
    .replace(/\s*[-–—]\s*/g, "-")
    .replace(/\s/g, "");
}

function normalizeYesNoDaNet(s: string): string {
  const t = normalizeCore(s);
  if (t === "д" || t === "да" || t === "yes" || t === "true") {
    return "да";
  }
  if (t === "н" && t.length === 1) {
    return "н";
  }
  if (t === "нет" || t === "no" || t === "false") {
    return "нет";
  }
  return t;
}

function matchesApprox(a: number, b: number, eps: number): boolean {
  return Math.abs(a - b) <= eps;
}

/**
 * Возвращает true, если ответ совпадает с ключом из методички.
 */
export function isKotOfficialAnswerCorrect(
  questionKey: KotQuestionKey,
  raw: string | null
): boolean {
  if (raw === null || raw.trim().length === 0) {
    return false;
  }
  return matchByQuestionKey(questionKey, raw);
}

function matchByQuestionKey(key: KotQuestionKey, raw: string): boolean {
  const n = normalizeCore(raw);

  switch (key) {
    case "q1":
      return n === "3";
    case "q2":
      return n === "3";
    case "q3":
      return n === "2";
    case "q4":
      return normalizeYesNoDaNet(raw) === "да";
    case "q5":
      return n === "4";
    case "q6":
      return n === "2";
    case "q7":
      return n === "4";
    case "q8":
      return n === "1";
    case "q9":
      return n === "5";
    case "q10":
      return n === "40";
    case "q11":
      return n === "3";
    case "q12":
      return matchQ12(raw);
    case "q13":
      return n === "4";
    case "q14":
      return n === "3";
    case "q15":
      return matchDecimalVariants(raw, [0.31], 0.001);
    case "q16":
      return n === "ни";
    case "q17":
      return n === "4";
    case "q18":
      return n === "4";
    case "q19":
      return n === "3";
    case "q20":
      return n === "н" || n === "неправильно";
    case "q21":
      return normalizeCommaList(raw) === "3,5" || normalizeCommaList(raw) === "5,3";
    case "q22":
      return n === "31";
    case "q23":
      return n === "2";
    case "q24":
      return n === "1";
    case "q25":
      return matchQ25(raw);
    case "q26":
      return n === "1";
    case "q27":
      return n === "1";
    case "q28":
      return n === "1";
    case "q29":
      return normalizeDashRange(raw) === "2-13";
    case "q30":
      return n === "3";
    case "q31":
      return n === "1600";
    case "q32":
      return normalizeCommaList(raw) === "1,2,4";
    case "q33":
      return n === "18";
    case "q34":
      return n === "3";
    case "q35":
      return n === "1";
    case "q36":
      return n === "1";
    case "q37":
      return matchDecimalVariants(raw, [4.8], 0.05);
    case "q38":
      return n === "1";
    case "q39":
      return n === "20";
    case "q40":
      return matchFractionEquals(raw, 1 / 8);
    case "q41":
      return n === "3";
    case "q42":
      return n === "3";
    case "q43":
      return matchQ43(raw);
    case "q44":
      return n === "1";
    case "q45":
      return matchFractionEquals(raw, 1 / 10);
    case "q46":
      return n === "280";
    case "q47":
      return matchDecimalVariants(raw, [4.5], 0.01);
    case "q48":
      return matchQ48(raw);
    case "q49":
      return n === "3";
    case "q50":
      return n === "3";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

function matchQ12(raw: string): boolean {
  const t = normalizeCore(raw).replace(/,/g, ".");
  if (t === "270") {
    return true;
  }
  const x = parseNumberLoose(t);
  if (x !== null && matchesApprox(x, 2.7, 0.01)) {
    return true;
  }
  return false;
}

function matchQ25(raw: string): boolean {
  const t = normalizeCore(raw).replace(/,/g, ".");
  if (t === "1500" || t === "15") {
    return true;
  }
  const x = parseNumberLoose(t);
  if (x !== null && matchesApprox(x, 1500, 1)) {
    return true;
  }
  if (x !== null && matchesApprox(x, 15, 0.01)) {
    return true;
  }
  return false;
}

function matchQ43(raw: string): boolean {
  const t = normalizeCore(raw).replace(/,/g, ".");
  if (t === "1") {
    return true;
  }
  if (t === "14") {
    return true;
  }
  const x = parseNumberLoose(t);
  if (x !== null && matchesApprox(x, 14, 0.01)) {
    return true;
  }
  return false;
}

function matchQ48(raw: string): boolean {
  const list = normalizeCommaList(raw);
  if (list === "1" || list === "1,5") {
    return true;
  }
  const n = normalizeCore(raw).replace(/\s/g, "");
  return n === "1и5" || n === "5и1" || n === "15";
}

function matchDecimalVariants(
  raw: string,
  targets: number[],
  eps: number
): boolean {
  const x = parseNumberLoose(raw.replace(/,/g, "."));
  if (x === null) {
    return false;
  }
  return targets.some((t) => matchesApprox(x, t, eps));
}

function matchFractionEquals(raw: string, value: number): boolean {
  const t = normalizeCore(raw).replace(/\s/g, "");
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (b !== 0 && Math.abs(a / b - value) < 1e-9) {
      return true;
    }
  }
  const x = parseNumberLoose(t);
  return x !== null && matchesApprox(x, value, 1e-6);
}
