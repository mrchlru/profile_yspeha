/**
 * Проверка пункта «Психологическое состояние» через API прода.
 */
import "dotenv/config";

const DEFAULT_BASE = "https://prolific-stillness-production-11ee.up.railway.app";

async function adminSessionCookie(baseUrl: string): Promise<string> {
  const email = process.env.ADMIN_PANEL_EMAIL?.trim();
  const password = process.env.ADMIN_PANEL_PASSWORD;
  if (!email || !password) {
    throw new Error("Нужны ADMIN_PANEL_EMAIL и ADMIN_PANEL_PASSWORD (railway run)");
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
  const headers = { Cookie: cookie };

  const searchRes = await fetch(
    `${baseUrl}/api/admin/results?q=${encodeURIComponent("Тагунов")}&type=audit`,
    { headers }
  );
  const searchBody = (await searchRes.json()) as {
    items?: ReadonlyArray<{
      folderKey?: string;
      key?: string;
      title?: string;
      displayName?: string;
    }>;
  };
  console.log("search items", JSON.stringify(searchBody.items?.slice(0, 5), null, 2));
  const folder = searchBody.items?.find((item) => {
    const label = `${item.title ?? ""} ${item.displayName ?? ""} ${item.folderKey ?? item.key ?? ""}`.toLowerCase();
    return label.includes("тагунов");
  });
  if (!folder) {
    console.log("Папка Тагунова не найдена");
    return;
  }
  const folderKey = folder.folderKey ?? folder.key;
  if (!folderKey) {
    console.log("Папка без ключа");
    return;
  }
  console.log("folder", folderKey, folder.displayName ?? folder.title);

  const folderRes = await fetch(
    `${baseUrl}/api/admin/results?folderKey=${encodeURIComponent(folderKey)}`,
    { headers }
  );
  const folderBody = (await folderRes.json()) as {
    folder?: {
      reportSessions?: ReadonlyArray<{ sessionId: string; label: string; source: string }>;
    };
  };
  const subs = (folderBody.folder?.reportSessions ?? []).filter(
    (item) => item.source === "audit"
  );
  for (const sub of subs) {
    const viewRes = await fetch(
      `${baseUrl}/api/admin/reports/view?folderKey=${encodeURIComponent(folderKey)}&documentId=short_report&sessionId=${encodeURIComponent(sub.sessionId)}`,
      { headers }
    );
    if (!viewRes.ok) {
      console.log(sub.sessionId, "short_report unavailable", viewRes.status);
      continue;
    }
    const view = (await viewRes.json()) as {
      view?: {
        generatedAt?: string | null;
        reportProfile?: string | null;
        testLines?: ReadonlyArray<{ title: string; briefAnswer: string; blockIndex?: number }>;
      };
    };
    console.log("sessionId:", sub.sessionId);
    console.log("generatedAt:", view.view?.generatedAt ?? "—");
    console.log("profile:", view.view?.reportProfile ?? "—");
    const psych = view.view?.testLines?.find((line) =>
      line.title.includes("Психологическое")
    );
    console.log("---", sub.label);
    console.log("title:", psych?.title ?? "—");
    console.log(psych?.briefAnswer ?? "нет строки");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
