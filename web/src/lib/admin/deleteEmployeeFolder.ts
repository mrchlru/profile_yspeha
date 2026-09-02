import { deleteAllEmployeeFolderFiles } from "@/lib/admin/folderFiles";
import { unmarkFolderArchived } from "@/lib/admin/folderArchiveMark";
import { parseEmployeeFolderKey } from "@/lib/admin/employeeFolderKey";
import { prisma } from "@/lib/prisma";

export type DeleteEmployeeFolderTarget =
  | { type: "folder" }
  | { type: "screening" }
  | { type: "invites" }
  | { type: "audit" }
  | { type: "screeningSubmission"; id: string }
  | { type: "auditSubmission"; id: string }
  | { type: "burnoutSubmission"; id: string }
  | { type: "profSbEducationSubmission"; id: string }
  | { type: "invite"; id: string };

export type DeleteEmployeeFolderResult = {
  deleted: number;
  folderRemoved: boolean;
};

/**
 * Удаляет папку сотрудника или отдельные данные внутри неё.
 */
export async function deleteEmployeeFolderData(
  folderKey: string,
  target: DeleteEmployeeFolderTarget
): Promise<DeleteEmployeeFolderResult> {
  const parsed = parseEmployeeFolderKey(folderKey);
  if (!parsed) {
    throw new Error("Некорректный ключ папки");
  }

  if (parsed.kind === "candidate") {
    return _deleteCandidateFolder(parsed.folderKey, target);
  }

  return _deleteAuditFolder(parsed.assesseeKey, target);
}

async function _deleteCandidateFolder(
  folderKey: string,
  target: DeleteEmployeeFolderTarget
): Promise<DeleteEmployeeFolderResult> {
  switch (target.type) {
    case "folder":
      return _deleteCandidateAll(folderKey);
    case "screening":
      return _wrapCount(
        await prisma.screeningSubmission.deleteMany({
          where: { candidateFolderKey: folderKey },
        })
      );
    case "invites":
      return _wrapCount(
        await prisma.accessInvite.deleteMany({
          where: { candidateFolderKey: folderKey },
        })
      );
    case "audit":
      throw new Error("В папке скрининга нет данных аудита");
    case "screeningSubmission": {
      const row = await prisma.screeningSubmission.findFirst({
        where: { id: target.id, candidateFolderKey: folderKey },
        select: { id: true },
      });
      if (!row) {
        throw new Error("Запись скрининга не найдена в этой папке");
      }
      await prisma.screeningSubmission.delete({ where: { id: row.id } });
      return { deleted: 1, folderRemoved: false };
    }
    case "invite": {
      const row = await prisma.accessInvite.findFirst({
        where: { id: target.id, candidateFolderKey: folderKey },
        select: { id: true },
      });
      if (!row) {
        throw new Error("Приглашение не найдено в этой папке");
      }
      await prisma.accessInvite.delete({ where: { id: row.id } });
      return { deleted: 1, folderRemoved: false };
    }
    case "burnoutSubmission": {
      const row = await prisma.burnoutSubmission.findFirst({
        where: { id: target.id, candidateFolderKey: folderKey },
        select: { id: true },
      });
      if (!row) {
        throw new Error("Запись теста на выгорание не найдена в этой папке");
      }
      await prisma.burnoutSubmission.delete({ where: { id: row.id } });
      return { deleted: 1, folderRemoved: false };
    }
    case "profSbEducationSubmission": {
      const row = await prisma.profSbEducationSubmission.findFirst({
        where: { id: target.id, candidateFolderKey: folderKey },
        select: { id: true },
      });
      if (!row) {
        throw new Error("Запись анкеты ПРОФ СБ + образование не найдена в этой папке");
      }
      await prisma.profSbEducationSubmission.delete({ where: { id: row.id } });
      return { deleted: 1, folderRemoved: false };
    }
    case "auditSubmission":
      throw new Error("В папке скрининга нет данных аудита");
    default:
      throw new Error("Неподдерживаемая операция удаления");
  }
}

async function _deleteAuditFolder(
  assesseeKey: string,
  target: DeleteEmployeeFolderTarget
): Promise<DeleteEmployeeFolderResult> {
  switch (target.type) {
    case "folder":
    case "audit": {
      const auditFolderKey = `audit:${assesseeKey}`;
      const [auditResult, filesDeleted] = await Promise.all([
        prisma.auditSubmission.deleteMany({
          where: { assesseeKey },
        }),
        deleteAllEmployeeFolderFiles(auditFolderKey),
      ]);
      await unmarkFolderArchived(auditFolderKey);
      return { deleted: auditResult.count + filesDeleted, folderRemoved: auditResult.count + filesDeleted > 0 };
    }
    case "auditSubmission": {
      const row = await prisma.auditSubmission.findFirst({
        where: { id: target.id, assesseeKey },
        select: { id: true },
      });
      if (!row) {
        throw new Error("Запись аудита не найдена в этой папке");
      }
      await prisma.auditSubmission.delete({ where: { id: row.id } });
      return { deleted: 1, folderRemoved: false };
    }
    case "screening":
    case "invites":
    case "screeningSubmission":
    case "invite":
      throw new Error("В папке аудита нет данных скрининга или приглашений");
    default:
      throw new Error("Неподдерживаемая операция удаления");
  }
}

async function _deleteCandidateAll(folderKey: string): Promise<DeleteEmployeeFolderResult> {
  const [screeningResult, inviteResult, burnoutResult, profResult, filesDeleted, candidateResult] =
    await Promise.all([
      prisma.screeningSubmission.deleteMany({
        where: { candidateFolderKey: folderKey },
      }),
      prisma.accessInvite.deleteMany({
        where: { candidateFolderKey: folderKey },
      }),
      prisma.burnoutSubmission.deleteMany({
        where: { candidateFolderKey: folderKey },
      }),
      prisma.profSbEducationSubmission.deleteMany({
        where: { candidateFolderKey: folderKey },
      }),
      deleteAllEmployeeFolderFiles(folderKey),
      prisma.candidateFolderRecord.deleteMany({
        where: { folderKey },
      }),
    ]);
  await prisma.burnoutReminderSchedule.deleteMany({
    where: { candidateFolderKey: folderKey },
  });
  await unmarkFolderArchived(folderKey);

  const deleted =
    screeningResult.count +
    inviteResult.count +
    burnoutResult.count +
    profResult.count +
    filesDeleted +
    candidateResult.count;
  return { deleted, folderRemoved: deleted > 0 };
}

function _wrapCount(result: { count: number }): DeleteEmployeeFolderResult {
  return { deleted: result.count, folderRemoved: result.count > 0 };
}
