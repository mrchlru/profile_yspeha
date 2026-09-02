import type { KotQuestionKey } from "@/lib/kot/step1Types";
import { KOT_STEP_QUESTION_COUNT } from "@/lib/kot/step1Types";

/**
 * Детерминированный порядок ключей q1…q30 для сессии (одинаковый при обновлении страницы).
 */
export function seededShuffleKotKeys(sessionId: string): KotQuestionKey[] {
  const keys: KotQuestionKey[] = [];
  for (let i = 1; i <= KOT_STEP_QUESTION_COUNT; i += 1) {
    keys.push(`q${String(i)}` as KotQuestionKey);
  }
  const seed = hashSessionIdToSeed(sessionId);
  const rand = mulberry32(seed);
  for (let i = keys.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const t = keys[i];
    keys[i] = keys[j]!;
    keys[j] = t!;
  }
  return keys;
}

function hashSessionIdToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function next(): number {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
