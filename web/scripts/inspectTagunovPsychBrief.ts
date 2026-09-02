/** Одноразовая проверка: managerBrief пункт 5 для Тагунова. */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { inferAuditReportProfileFromStored } from "../src/lib/admin/inferAuditReportProfileFromStored";
import { parseStoredAuditReportJson } from "../src/lib/admin/buildEmployeeDashboardPreview";

async function main(): Promise<void> {
  const rows = await prisma.auditSubmission.findMany({
    where: {
      OR: [
        { lastName: { contains: "Тагунов", mode: "insensitive" } },
        { lastName: { contains: "Tagunov", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      auditReport: true,
    },
  });

  console.log(`found ${String(rows.length)} rows`);
  for (const row of rows) {
    const stored = parseStoredAuditReportJson(row.auditReport);
    const profile = stored ? inferAuditReportProfileFromStored(stored) : null;
    const line5 = stored?.managerBrief?.testLines?.find((l) => l.title.includes("Психологическое"));
    console.log("---");
    console.log(`${row.lastName} ${row.firstName} | ${row.createdAt.toISOString()} | ${row.sessionId}`);
    console.log(`profile=${String(profile)}`);
    console.log(`psych line: ${line5?.briefAnswer?.slice(0, 200) ?? "—"}…`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
