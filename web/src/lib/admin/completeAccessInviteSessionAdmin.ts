import { normalizeAccessCode } from "@/lib/access/accessCode";
import { markAccessCodeUsed } from "@/lib/access/markAccessCodeUsed";
import {
  isAuditAccessTestKind,
  isTestKind,
  TEST_KIND_SCREENING,
  type TestKind,
} from "@/lib/access/testKinds";
import {
  finalizeIncompleteAuditSubmission,
  type FinalizeIncompleteAuditResult,
} from "@/lib/admin/finalizeIncompleteAuditSubmission";
import { findAuditSessionIdForAccessInvite } from "@/lib/admin/findAuditSessionIdForAccessInvite";
import { computeInviteStatus, INVITE_STATUS_IN_PROGRESS } from "@/lib/admin/inviteStatus";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { prisma } from "@/lib/prisma";
import {
  runScreeningReportPipelineForStoredInvite,
  type RunScreeningReportPipelineForStoredInviteResult,
} from "@/lib/screening/runScreeningReportPipelineForStoredInvite";

export type CompleteAccessInviteSessionResult = {
  accessCode: string;
  testKind: TestKind;
  inviteMarkedUsed: boolean;
  screening: RunScreeningReportPipelineForStoredInviteResult | null;
  auditFinalize: FinalizeIncompleteAuditResult | null;
  warnings: string[];
};

/**
 * Принудительно завершает прохождение: дособирает отчёты из БД и помечает код «Пройден».
 */
export async function completeAccessInviteSessionAdmin(input: {
  inviteId?: string;
  accessCode?: string;
  forceMarkUsed?: boolean;
}): Promise<CompleteAccessInviteSessionResult> {
  const invite = await _loadInvite(input);
  if (invite.revokedAt !== null) {
    throw new Error("Приглашение отозвано — завершение невозможно");
  }
  if (!isTestKind(invite.testKind)) {
    throw new Error("Неизвестный тип теста");
  }
  const testKind = invite.testKind;

  const accessCode = invite.code;
  const warnings: string[] = [];
  let auditFinalize: FinalizeIncompleteAuditResult | null = null;
  let screening: RunScreeningReportPipelineForStoredInviteResult | null = null;

  if (isAuditAccessTestKind(testKind)) {
    const auditSessionId = await findAuditSessionIdForAccessInvite(accessCode);
    if (auditSessionId !== null) {
      try {
        auditFinalize = await finalizeIncompleteAuditSubmission({
          sessionId: auditSessionId,
          accessCode,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Не удалось дособрать аудит";
        warnings.push(message);
        screeningServerLog("admin_invite_complete", "audit_finalize_failed", {
          code: accessCode,
          message: message.slice(0, 300),
        });
      }
    } else {
      warnings.push("Сессия аудита с ответами не найдена");
    }
  }

  if (testKind === TEST_KIND_SCREENING) {
    screening = await runScreeningReportPipelineForStoredInvite(accessCode);
    if (screening.ok === false) {
      warnings.push(
        screening.reason === "incomplete_steps"
          ? "Анкета скрининга неполная — отчёт КОТ не собран"
          : "Не удалось собрать отчёт КОТ из сохранённых данных"
      );
    }
  }

  const refreshed = await prisma.accessInvite.findUnique({
    where: { id: invite.id },
    select: { usedAt: true },
  });

  let inviteMarkedUsed = refreshed?.usedAt !== null && refreshed?.usedAt !== undefined;
  if (!inviteMarkedUsed) {
    const status = computeInviteStatus({
      revokedAt: invite.revokedAt,
      usedAt: invite.usedAt,
      startedAt: invite.startedAt,
      expiresAt: invite.expiresAt,
    });
    const canForce =
      input.forceMarkUsed === true || status === INVITE_STATUS_IN_PROGRESS;
    if (canForce) {
      inviteMarkedUsed = await markAccessCodeUsed(accessCode, testKind);
      if (!inviteMarkedUsed) {
        warnings.push("Код не обновлён (возможно, уже пройден или тип теста не совпадает)");
      }
    } else {
      warnings.push("Код не помечен пройденным — нет сохранённых ответов для отчёта");
    }
  }

  screeningServerLog("admin_invite_complete", "done", {
    code: accessCode,
    marked: inviteMarkedUsed,
    warningCount: warnings.length,
  });

  return {
    accessCode,
    testKind,
    inviteMarkedUsed,
    screening,
    auditFinalize,
    warnings,
  };
}

async function _loadInvite(input: {
  inviteId?: string;
  accessCode?: string;
}): Promise<{
  id: string;
  code: string;
  testKind: string;
  revokedAt: Date | null;
  usedAt: Date | null;
  startedAt: Date | null;
  expiresAt: Date;
}> {
  const inviteId = input.inviteId?.trim() ?? "";
  const accessCodeRaw = input.accessCode?.trim() ?? "";

  if (inviteId.length === 0 && accessCodeRaw.length === 0) {
    throw new Error("Укажите inviteId или accessCode");
  }

  if (inviteId.length > 0) {
    const row = await prisma.accessInvite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        code: true,
        testKind: true,
        revokedAt: true,
        usedAt: true,
        startedAt: true,
        expiresAt: true,
      },
    });
    if (row === null) {
      throw new Error("Приглашение не найдено");
    }
    if (accessCodeRaw.length > 0 && normalizeAccessCode(accessCodeRaw) !== row.code) {
      throw new Error("Код не совпадает с выбранным приглашением");
    }
    return row;
  }

  const code = normalizeAccessCode(accessCodeRaw);
  const row = await prisma.accessInvite.findFirst({
    where: { code },
    select: {
      id: true,
      code: true,
      testKind: true,
      revokedAt: true,
      usedAt: true,
      startedAt: true,
      expiresAt: true,
    },
  });
  if (row === null) {
    throw new Error("Приглашение не найдено");
  }
  return row;
}
