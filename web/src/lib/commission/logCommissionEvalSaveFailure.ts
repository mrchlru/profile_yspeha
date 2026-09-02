import type { CommissionEvalFailureKind } from "@/lib/commission/commissionEvalSaveErrors";
import { prisma } from "@/lib/prisma";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type CommissionEvalSaveFailureLogInput = {
  memberLastName: string;
  memberFirstName: string;
  questionText: string | null;
  errorMessage: string;
  failureKind: CommissionEvalFailureKind;
  interviewFolderKey?: string | null;
  candidateFolderKey?: string | null;
  memberId?: string | null;
};

/**
 * Сохраняет запись о неудачном сохранении анкеты комиссии для админ-лога.
 */
export async function logCommissionEvalSaveFailure(
  input: CommissionEvalSaveFailureLogInput
): Promise<void> {
  try {
    await prisma.commissionEvalSaveFailureLog.create({
      data: {
        memberLastName: input.memberLastName.trim(),
        memberFirstName: input.memberFirstName.trim(),
        questionText: input.questionText?.trim() || null,
        errorMessage: input.errorMessage.trim(),
        failureKind: input.failureKind,
        interviewFolderKey: input.interviewFolderKey ?? null,
        candidateFolderKey: input.candidateFolderKey ?? null,
        memberId: input.memberId ?? null,
      },
    });
  } catch (err) {
    screeningServerLog("commission_eval_save_log", "persist_failed", {
      failureKind: input.failureKind,
      errorName: err instanceof Error ? err.name : "unknown",
    });
  }
}

export type CommissionEvalSaveFailureLogView = {
  id: string;
  createdAt: string;
  memberLastName: string;
  memberFirstName: string;
  questionText: string | null;
  errorMessage: string;
  failureKind: CommissionEvalFailureKind;
};

/**
 * Возвращает последние записи лога сбоев сохранения анкет комиссии.
 */
export async function listCommissionEvalSaveFailureLogs(
  limit = 100
): Promise<CommissionEvalSaveFailureLogView[]> {
  const rows = await prisma.commissionEvalSaveFailureLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    memberLastName: row.memberLastName,
    memberFirstName: row.memberFirstName,
    questionText: row.questionText,
    errorMessage: row.errorMessage,
    failureKind: row.failureKind as CommissionEvalFailureKind,
  }));
}
