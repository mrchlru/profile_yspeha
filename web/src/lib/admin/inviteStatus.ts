import { isTestKind, TEST_KIND_LABELS, type TestKind } from "@/lib/access/testKinds";
import { ADMIN_TEST_CATALOG } from "@/lib/admin/adminTestCatalog";

export const INVITE_STATUS_ACTIVE = "active" as const;
export const INVITE_STATUS_USED = "used" as const;
export const INVITE_STATUS_EXPIRED = "expired" as const;
export const INVITE_STATUS_REVOKED = "revoked" as const;

export type InviteStatus =
  | typeof INVITE_STATUS_ACTIVE
  | typeof INVITE_STATUS_USED
  | typeof INVITE_STATUS_EXPIRED
  | typeof INVITE_STATUS_REVOKED;

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  active: "Активен",
  used: "Пройден",
  expired: "Истёк",
  revoked: "Отозван",
};

type InviteRow = {
  revokedAt: Date | null;
  usedAt: Date | null;
  expiresAt: Date;
};

/**
 * Определяет статус приглашения по полям записи.
 */
export function computeInviteStatus(row: InviteRow, now: Date = new Date()): InviteStatus {
  if (row.revokedAt) {
    return INVITE_STATUS_REVOKED;
  }
  if (row.usedAt) {
    return INVITE_STATUS_USED;
  }
  if (row.expiresAt.getTime() < now.getTime()) {
    return INVITE_STATUS_EXPIRED;
  }
  return INVITE_STATUS_ACTIVE;
}

/**
 * Человекочитаемое название типа теста для админ-панели.
 */
export function inviteTestKindLabel(testKind: string): string {
  if (isTestKind(testKind)) {
    return TEST_KIND_LABELS[testKind];
  }

  const catalog = ADMIN_TEST_CATALOG.find((item) => item.id === testKind);
  if (catalog) {
    return catalog.title;
  }

  return testKind;
}

/**
 * Возвращает testKind для фильтра результатов.
 */
export function parseResultsTestKindFilter(value: string): TestKind | "all" | null {
  if (value === "all") {
    return "all";
  }
  return isTestKind(value) ? value : null;
}

/**
 * Разбирает фильтр статуса приглашения из query-параметра.
 */
export function parseInviteStatusFilter(
  value: string | null | undefined
): InviteStatus | "all" {
  if (
    value === INVITE_STATUS_ACTIVE ||
    value === INVITE_STATUS_USED ||
    value === INVITE_STATUS_EXPIRED ||
    value === INVITE_STATUS_REVOKED
  ) {
    return value;
  }
  return "all";
}
