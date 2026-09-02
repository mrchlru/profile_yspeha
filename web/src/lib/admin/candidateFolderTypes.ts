export const CANDIDATE_LIFECYCLE_INTERVIEW = "interview" as const;
export const CANDIDATE_LIFECYCLE_ACTIVE = "active" as const;
export const CANDIDATE_LIFECYCLE_ARCHIVED = "archived" as const;

export type CandidateLifecycleStatus =
  | typeof CANDIDATE_LIFECYCLE_INTERVIEW
  | typeof CANDIDATE_LIFECYCLE_ACTIVE
  | typeof CANDIDATE_LIFECYCLE_ARCHIVED;

export const ARCHIVE_REASON_DISMISSED = "dismissed" as const;
export const ARCHIVE_REASON_INTERVIEW_NOT_HIRED = "interview_not_hired" as const;

export type CandidateArchiveReason =
  | typeof ARCHIVE_REASON_DISMISSED
  | typeof ARCHIVE_REASON_INTERVIEW_NOT_HIRED;

export type CandidateFolderRecordSummary = {
  folderKey: string;
  displayName: string;
  lifecycleStatus: CandidateLifecycleStatus;
  archiveReason: CandidateArchiveReason | null;
  lastName: string;
  firstName: string;
  middleName: string | null;
  birthDate: string;
  activatedAt: string | null;
  archivedAt: string | null;
};

export type CandidateLookupReason =
  | "currently_employed"
  | "previously_dismissed"
  | "interview_archived"
  | "in_interview";

export type CandidateLookupMatch = {
  folderKey: string;
  displayName: string;
  lifecycleStatus: CandidateLifecycleStatus;
  reason: CandidateLookupReason;
  reasonLabel: string;
  willReuseFolder: true;
};

export type InterviewFolderScreeningReportSession = {
  sessionId: string;
  label: string;
  createdAt: string;
};

export type InterviewFolderCandidateSummary = {
  folderKey: string;
  displayName: string;
  lifecycleStatus: CandidateLifecycleStatus;
  hasScreening: boolean;
  pendingInvite: boolean;
  screeningSessions: number;
  /** Сессии скрининга с готовым отчётом (КОТ + заключение). */
  screeningReportSessions: ReadonlyArray<InterviewFolderScreeningReportSession>;
  lastActivityAt: string | null;
  positionLevelLabel: string | null;
};
