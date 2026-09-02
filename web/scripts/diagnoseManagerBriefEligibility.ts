/**
 * Диагностика eligibility пересборки managerBrief (через railway run на проде).
 */
import "dotenv/config";
import { Prisma } from "@/generated/prisma/client";

import { parseStoredAuditReportJson } from "@/lib/admin/buildEmployeeDashboardPreview";
import { inferAuditReportProfileFromStored } from "@/lib/admin/inferAuditReportProfileFromStored";
import { prisma } from "@/lib/prisma";
import type { AuditReportProfile } from "@/lib/audit/report/auditReportProfile";

const MANAGER_BRIEF_PROFILES: ReadonlySet<AuditReportProfile> = new Set([
  "od_reserve",
  "tu_management_chef",
]);

const OD_PSYCH_TITLE = "Психологическое состояние";

function resolveProfile(
  stored: NonNullable<ReturnType<typeof parseStoredAuditReportJson>>
): AuditReportProfile | null {
  const inferred = stored.reportProfile ?? inferAuditReportProfileFromStored(stored);
  if (MANAGER_BRIEF_PROFILES.has(inferred)) {
    return inferred;
  }
  const hasPsych = (stored.managerBrief?.testLines ?? []).some(
    (line) =>
      line.title.trim() === OD_PSYCH_TITLE ||
      line.title.includes("Психологическое состояние") ||
      line.blockIndex === 5
  );
  return hasPsych ? "od_reserve" : null;
}

async function main(): Promise<void> {
  const rows = await prisma.auditSubmission.findMany({
    where: { auditReport: { not: Prisma.DbNull } },
    orderBy: { createdAt: "asc" },
    select: {
      sessionId: true,
      lastName: true,
      firstName: true,
      createdAt: true,
      auditReport: true,
    },
  });

  let eligible = 0;
  const tagunov: Array<{
    sessionId: string;
    createdAt: string;
    profile: string | null;
    generatedAt: string | null;
    psychPreview: string;
  }> = [];

  for (const row of rows) {
    const stored = parseStoredAuditReportJson(row.auditReport);
    if (!stored) {
      continue;
    }
    const profile = resolveProfile(stored);
    if (profile !== null) {
      eligible += 1;
    }
    const name = `${row.lastName} ${row.firstName}`.toLowerCase();
    if (!name.includes("тагунов")) {
      continue;
    }
    const psych = stored.managerBrief?.testLines?.find((line) =>
      line.title.includes("Психологическое")
    );
    tagunov.push({
      sessionId: row.sessionId,
      createdAt: row.createdAt.toISOString(),
      profile,
      generatedAt: stored.generatedAt ?? null,
      psychPreview: (psych?.briefAnswer ?? "—").slice(0, 120),
    });
  }

  console.log("total rows", rows.length);
  console.log("eligible", eligible);
  console.log("tagunov", JSON.stringify(tagunov, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
