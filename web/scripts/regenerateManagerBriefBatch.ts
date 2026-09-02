/**
 * Пакетная пересборка «Отчёта для руководителя» (ОД / ТУ) по сохранённым auditSubmission.
 *
 *   npx tsx scripts/regenerateManagerBriefBatch.ts
 *   npx tsx scripts/regenerateManagerBriefBatch.ts --no-ai
 *
 * На проде (переменные Railway):
 *   railway run -- npx tsx scripts/regenerateManagerBriefBatch.ts
 */
import "dotenv/config";

import { regenerateStoredManagerBriefConclusions } from "../src/lib/admin/regenerateStoredManagerBriefConclusions";

async function main(): Promise<void> {
  const useAi = !process.argv.includes("--no-ai");
  const batchSize = useAi ? 3 : 20;

  let afterSessionId: string | null = null;
  let batchIndex = 0;
  const aggregate = {
    totalAuditRows: 0,
    eligible: 0,
    updated: 0,
    skippedProfile: 0,
    skippedInvalid: 0,
    failed: 0,
    errors: [] as { sessionId: string; message: string }[],
  };

  console.log(
    `[regenerateManagerBriefBatch] useAi=${String(useAi)} batchSize=${String(batchSize)}`
  );

  for (;;) {
    batchIndex += 1;
    const result = await regenerateStoredManagerBriefConclusions({
      useAi,
      batchSize,
      afterSessionId,
    });

    if (aggregate.totalAuditRows === 0 && result.totalAuditRows > 0) {
      aggregate.totalAuditRows = result.totalAuditRows;
      aggregate.skippedProfile = result.skippedProfile;
      aggregate.skippedInvalid = result.skippedInvalid;
    }

    aggregate.eligible += result.eligible;
    aggregate.updated += result.updated;
    aggregate.failed += result.failed;
    aggregate.errors.push(...result.errors);

    console.log(
      `[regenerateManagerBriefBatch] batch=${String(batchIndex)} updated=${String(result.updated)} ` +
        `failed=${String(result.failed)} hasMore=${String(result.hasMore)} ` +
        `next=${result.nextAfterSessionId ?? "—"}`
    );

    if (!result.hasMore || !result.nextAfterSessionId) {
      break;
    }
    afterSessionId = result.nextAfterSessionId;
  }

  console.log("[regenerateManagerBriefBatch] done", JSON.stringify(aggregate, null, 2));
}

main().catch((err) => {
  console.error("[regenerateManagerBriefBatch] fatal", err);
  process.exit(1);
});
