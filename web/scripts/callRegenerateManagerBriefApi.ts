/**
 * Пересборка «Отчёта для руководителя» через HTTP API (прод или локаль).
 *
 *   npx tsx scripts/callRegenerateManagerBriefApi.ts
 *   SUBMIT_BASE=https://prolific-stillness-production-11ee.up.railway.app npx tsx scripts/callRegenerateManagerBriefApi.ts
 */
import "dotenv/config";

const DEFAULT_BASE = "https://prolific-stillness-production-11ee.up.railway.app";

type BatchResult = {
  totalAuditRows: number;
  eligible: number;
  updated: number;
  skippedProfile: number;
  skippedInvalid: number;
  failed: number;
  errors: ReadonlyArray<{ sessionId: string; message: string }>;
  hasMore: boolean;
  nextAfterSessionId: string | null;
};

async function adminSessionCookie(baseUrl: string): Promise<string> {
  const email = process.env.ADMIN_PANEL_EMAIL?.trim();
  const password = process.env.ADMIN_PANEL_PASSWORD;
  if (!email || !password) {
    throw new Error("Задайте ADMIN_PANEL_EMAIL и ADMIN_PANEL_PASSWORD");
  }

  const res = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed: HTTP ${String(res.status)} ${await res.text()}`);
  }

  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter((v): v is string => v !== null);
  const sessionPair = setCookies
    .map((line) => line.split(";")[0]?.trim())
    .find((line) => line?.startsWith("drives_admin_session="));
  if (!sessionPair) {
    throw new Error("Сессия админки не получена (нет drives_admin_session)");
  }
  return sessionPair;
}

async function regenerateBatch(
  baseUrl: string,
  cookie: string,
  afterSessionId: string | null
): Promise<BatchResult> {
  const res = await fetch(`${baseUrl}/api/admin/reports/regenerate-manager-brief`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      confirm: true,
      useAi: true,
      batchSize: 3,
      afterSessionId,
    }),
  });

  const raw = await res.text();
  let body: BatchResult | { error?: string };
  try {
    body = JSON.parse(raw) as BatchResult | { error?: string };
  } catch {
    throw new Error(`Не JSON (${String(res.status)}): ${raw.slice(0, 400)}`);
  }

  if (!res.ok) {
    throw new Error(
      "error" in body && body.error ? body.error : `HTTP ${String(res.status)}`
    );
  }
  return body as BatchResult;
}

async function main(): Promise<void> {
  const baseUrl = (process.env.SUBMIT_BASE ?? process.env.APP_URL ?? DEFAULT_BASE).replace(
    /\/$/,
    ""
  );
  console.log(`[callRegenerateManagerBriefApi] base=${baseUrl}`);

  const cookie = await adminSessionCookie(baseUrl);
  let afterSessionId: string | null = null;
  let batchIndex = 0;
  const aggregate = {
    totalAuditRows: 0,
    eligible: 0,
    updated: 0,
    failed: 0,
    errors: [] as { sessionId: string; message: string }[],
  };

  for (;;) {
    batchIndex += 1;
    console.log(`[callRegenerateManagerBriefApi] batch ${String(batchIndex)}…`);
    const result = await regenerateBatch(baseUrl, cookie, afterSessionId);

    if (aggregate.totalAuditRows === 0 && result.totalAuditRows > 0) {
      aggregate.totalAuditRows = result.totalAuditRows;
    }
    aggregate.eligible += result.eligible;
    aggregate.updated += result.updated;
    aggregate.failed += result.failed;
    aggregate.errors.push(...result.errors);

    console.log(
      `[callRegenerateManagerBriefApi] batch ${String(batchIndex)}: updated=${String(result.updated)} ` +
        `failed=${String(result.failed)} hasMore=${String(result.hasMore)}`
    );

    if (!result.hasMore || !result.nextAfterSessionId) {
      break;
    }
    afterSessionId = result.nextAfterSessionId;
  }

  console.log("[callRegenerateManagerBriefApi] done", JSON.stringify(aggregate, null, 2));
}

main().catch((err) => {
  console.error("[callRegenerateManagerBriefApi] fatal", err);
  process.exit(1);
});
