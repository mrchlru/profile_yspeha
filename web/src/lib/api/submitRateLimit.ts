import { maskClientIp } from "@/lib/logging/maskClientIp";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

/**
 * In-memory учёт успешных отправок анкеты по IP (POST /api/submit).
 * Не более {@link MAX_SUBMITS_PER_HOUR} за скользящий час на один IP.
 * Для нескольких инстансов serverless — Upstash Redis или общий store.
 */

const MAX_SUBMITS_PER_HOUR = 3;
const WINDOW_MS = 60 * 60 * 1000;

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

function _pruneOld(now: number, timestamps: number[]): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

function _getBucket(ip: string): Bucket {
  const existing = buckets.get(ip);
  if (existing) {
    return existing;
  }
  const created: Bucket = { timestamps: [] };
  buckets.set(ip, created);
  return created;
}

/**
 * Число успешных отправок за последний час (без записи новой).
 */
export function getSuccessfulSubmitCountInWindow(clientIp: string): number {
  const now = Date.now();
  const bucket = _getBucket(clientIp);
  bucket.timestamps = _pruneOld(now, bucket.timestamps);
  return bucket.timestamps.length;
}

/**
 * True, если уже достигнут лимит успешных отправок за час.
 */
export function isSubmitRateLimitExceeded(clientIp: string): boolean {
  return getSuccessfulSubmitCountInWindow(clientIp) >= MAX_SUBMITS_PER_HOUR;
}

/**
 * Записать успешную отправку анкеты (после сохранения в БД).
 */
export function recordSuccessfulSubmit(clientIp: string): void {
  const now = Date.now();
  const bucket = _getBucket(clientIp);
  bucket.timestamps = _pruneOld(now, bucket.timestamps);
  bucket.timestamps.push(now);
  screeningServerLog("rate_limit", "success_recorded", {
    ipMasked: maskClientIp(clientIp),
    countInWindow: bucket.timestamps.length,
    maxPerHour: MAX_SUBMITS_PER_HOUR,
  });
}
