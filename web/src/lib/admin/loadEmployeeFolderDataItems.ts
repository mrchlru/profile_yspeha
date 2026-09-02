import type { EmployeeFolderDataItem } from "@/lib/admin/employeeFolderTypes";
import { parseEmployeeFolderKey } from "@/lib/admin/employeeFolderKey";
import { prisma } from "@/lib/prisma";

/**
 * Загружает перечень удаляемых записей, составляющих папку.
 */
export async function loadEmployeeFolderDataItems(
  folderKey: string
): Promise<EmployeeFolderDataItem[]> {
  const parsed = parseEmployeeFolderKey(folderKey);
  if (!parsed) {
    return [];
  }

  if (parsed.kind === "candidate") {
    const [inviteRows, screeningRows, burnoutRows, profRows] = await Promise.all([
      prisma.accessInvite.findMany({
        where: { candidateFolderKey: parsed.folderKey },
        orderBy: { createdAt: "desc" },
        select: { id: true, code: true, createdAt: true },
      }),
      prisma.screeningSubmission.findMany({
        where: { candidateFolderKey: parsed.folderKey },
        orderBy: { createdAt: "desc" },
        select: { id: true, profileName: true, createdAt: true },
      }),
      prisma.burnoutSubmission.findMany({
        where: { candidateFolderKey: parsed.folderKey },
        orderBy: { createdAt: "desc" },
        select: { id: true, lastName: true, firstName: true, createdAt: true },
      }),
      prisma.profSbEducationSubmission.findMany({
        where: { candidateFolderKey: parsed.folderKey },
        orderBy: { createdAt: "desc" },
        select: { id: true, lastName: true, firstName: true, createdAt: true },
      }),
    ]);

    const items: EmployeeFolderDataItem[] = [
      ...inviteRows.map((row) => ({
        kind: "invite" as const,
        id: row.id,
        label: `Приглашение ${row.code}`,
        createdAt: row.createdAt.toISOString(),
      })),
      ...screeningRows.map((row) => ({
        kind: "screening" as const,
        id: row.id,
        label: `Скрининг — ${row.profileName}`,
        createdAt: row.createdAt.toISOString(),
      })),
      ...burnoutRows.map((row) => ({
        kind: "burnout" as const,
        id: row.id,
        label: `Выгорание — ${row.lastName} ${row.firstName}`,
        createdAt: row.createdAt.toISOString(),
      })),
      ...profRows.map((row) => ({
        kind: "profSbEducation" as const,
        id: row.id,
        label: `ПРОФ СБ + образование — ${row.lastName} ${row.firstName}`,
        createdAt: row.createdAt.toISOString(),
      })),
    ];

    return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  const auditRows = await prisma.auditSubmission.findMany({
    where: { assesseeKey: parsed.assesseeKey },
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, lastName: true, createdAt: true },
  });

  return auditRows.map((row) => ({
    kind: "audit" as const,
    id: row.id,
    label: `ОД / ТУ / резерв — ${row.lastName} ${row.firstName}`,
    createdAt: row.createdAt.toISOString(),
  }));
}
