import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";

/** Срок действия кода приглашения с момента создания (сутки × 24 ч). */
export const ACCESS_INVITE_VALIDITY_DAYS = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function inviteExpiresAtFrom(createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + ACCESS_INVITE_VALIDITY_DAYS * MS_PER_DAY);
}

/**
 * Считает новую дату окончания при продлении: +3 суток от большей из текущей даты
 * окончания и «сейчас» (для истёкших кодов отсчёт идёт с момента продления).
 */
export function computeExtendedInviteExpiresAt(
  currentExpiresAt: Date,
  now: Date = new Date()
): Date {
  const base = currentExpiresAt.getTime() > now.getTime() ? currentExpiresAt : now;
  return inviteExpiresAtFrom(base);
}

export function formatInviteValidThroughRu(expiresAt: Date): string {
  return formatMoscowDateTime(expiresAt);
}
