import {
  CANDIDATE_LIFECYCLE_ACTIVE,
  CANDIDATE_LIFECYCLE_ARCHIVED,
  CANDIDATE_LIFECYCLE_INTERVIEW,
  type InterviewFolderCandidateSummary,
} from "@/lib/admin/candidateFolderTypes";

export type InterviewCandidateStatusTone = "neutral" | "warn" | "ok" | "muted";

export type InterviewCandidateStatusChip = {
  label: string;
  tone: InterviewCandidateStatusTone;
  forming?: boolean;
};

/**
 * Отображаемое название вакансии с заглавной буквы.
 */
export function formatVacancyTitleDisplay(title: string): string {
  const trimmed = title.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  const first = trimmed.charAt(0).toLocaleUpperCase("ru-RU");
  return first + trimmed.slice(1);
}

/**
 * Разбивает displayName папки «Должность · дата» на заголовок и дату.
 */
export function splitInterviewFolderDisplayName(displayName: string): {
  title: string;
  datePart: string | null;
} {
  const parts = displayName.split("·").map((part) => part.trim());
  if (parts.length >= 2) {
    return {
      title: formatVacancyTitleDisplay(parts[0] ?? displayName),
      datePart: parts.slice(1).join(" · "),
    };
  }
  return { title: formatVacancyTitleDisplay(displayName), datePart: null };
}

/**
 * Склонение «сессия» для счётчика скринингов.
 */
export function formatScreeningSessionCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) {
    return `${String(count)} сессий`;
  }
  if (mod10 === 1) {
    return `${String(count)} сессия`;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${String(count)} сессии`;
  }
  return `${String(count)} сессий`;
}

/**
 * Чип статуса кандидата в списке папки вакансии.
 */
export function interviewCandidateStatusChip(
  candidate: InterviewFolderCandidateSummary,
  commissionConclusionReady?: boolean
): InterviewCandidateStatusChip {
  if (candidate.pendingInvite) {
    return { label: "Ожидает прохождения", tone: "warn" };
  }
  if (!candidate.hasScreening) {
    return { label: "Не проходил", tone: "muted" };
  }
  if (candidate.screeningReportSessions.length === 0) {
    return { label: "Формируется", tone: "warn", forming: true };
  }
  if (candidate.lifecycleStatus === CANDIDATE_LIFECYCLE_ACTIVE) {
    return { label: "Оценён", tone: "ok" };
  }
  if (candidate.lifecycleStatus === CANDIDATE_LIFECYCLE_ARCHIVED) {
    return { label: "В архиве", tone: "muted" };
  }
  if (commissionConclusionReady) {
    return { label: "Оценён", tone: "ok" };
  }
  if (candidate.lifecycleStatus === CANDIDATE_LIFECYCLE_INTERVIEW) {
    return { label: "Ждёт комиссию", tone: "neutral" };
  }
  return { label: "Скрининг пройден", tone: "ok" };
}

/**
 * Инициалы для аватара кандидата.
 */
export function candidateAvatarInitials(displayName: string): string {
  const parts = displayName.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toLocaleUpperCase("ru-RU");
  }
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toLocaleUpperCase("ru-RU");
}
