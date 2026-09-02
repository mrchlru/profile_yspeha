/**
 * Целевая пересборка managerBrief для сессий Тагунова Бориса.
 */
import "dotenv/config";

const DEFAULT_BASE = "https://prolific-stillness-production-11ee.up.railway.app";

const TAGUNOV_SESSION_IDS = [
  "478ecad5-2ab6-491f-bd08-323c32bdf33d",
  "a1adb731-4974-4814-8da2-39dff0b4ebef",
] as const;

async function adminSessionCookie(baseUrl: string): Promise<string> {
  const email = process.env.ADMIN_PANEL_EMAIL?.trim();
  const password = process.env.ADMIN_PANEL_PASSWORD;
  if (!email || !password) {
    throw new Error("Нужны ADMIN_PANEL_EMAIL и ADMIN_PANEL_PASSWORD");
  }
  const res = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login HTTP ${String(res.status)}`);
  }
  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter((v): v is string => v !== null);
  const sessionPair = setCookies
    .map((line) => line.split(";")[0]?.trim())
    .find((line) => line?.startsWith("drives_admin_session="));
  if (!sessionPair) {
    throw new Error("Нет cookie сессии");
  }
  return sessionPair;
}

async function main(): Promise<void> {
  const baseUrl = (process.env.SUBMIT_BASE ?? process.env.APP_URL ?? DEFAULT_BASE).replace(
    /\/$/,
    ""
  );
  const cookie = await adminSessionCookie(baseUrl);
  const res = await fetch(`${baseUrl}/api/admin/reports/regenerate-manager-brief`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      confirm: true,
      useAi: true,
      sessionIds: [...TAGUNOV_SESSION_IDS],
    }),
  });
  const body = (await res.json()) as Record<string, unknown>;
  console.log(JSON.stringify(body, null, 2));
  if (!res.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
