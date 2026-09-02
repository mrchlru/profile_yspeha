import { formatCandidateBirthDateRu } from "@/lib/admin/buildCandidateFolderKey";

export type InterviewFolderSummary = {
  key: string;
  displayName: string;
  positionTitle: string;
  firstScreeningAt: string;
  screeningCount: number;
  /** Уникальные кандидаты (по candidateFolderKey) в папке. */
  candidateCount: number;
  /** Неиспользованные приглашения на скрининг в этой папке. */
  pendingInviteCount: number;
  lastActivityAt: string | null;
};

const INTERVIEW_FOLDER_KEY_PREFIX = "interview";

/**
 * Форматирует дату первого скрининга для названия папки.
 */
export function formatInterviewFolderDateRu(date: Date): string {
  return formatCandidateBirthDateRu(date);
}

/**
 * Строит ключ и отображаемое имя папки собеседования.
 */
export function buildInterviewFolderIdentity(
  positionTitle: string,
  firstScreeningAt: Date
): { key: string; displayName: string; positionTitleDisplay: string } | null {
  const positionTitleDisplay = _normalizePositionTitle(positionTitle);
  if (positionTitleDisplay.length === 0) {
    return null;
  }

  const firstScreeningIso = firstScreeningAt.toISOString().slice(0, 10);
  const slug = _slugify(positionTitleDisplay);
  if (slug.length === 0) {
    return null;
  }

  return {
    key: `${INTERVIEW_FOLDER_KEY_PREFIX}:${slug}:${firstScreeningIso}`,
    displayName: `${positionTitleDisplay} · ${formatInterviewFolderDateRu(firstScreeningAt)}`,
    positionTitleDisplay,
  };
}

function _normalizePositionTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function _slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
