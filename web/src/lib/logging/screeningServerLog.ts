import type { ZodError } from "zod";

type ServerLogMeta = Record<string, string | number | boolean | null | undefined>;

/**
 * Структурированный лог сервера для сценария «Профиль Успеха».
 * Не передавайте сюда тело анкеты, ФИО, email, токены Turnstile/OpenAI.
 */
export function screeningServerLog(
  phase: string,
  message: string,
  meta?: ServerLogMeta
): void {
  const ts = new Date().toISOString();
  const payload: Record<string, unknown> = {
    ts,
    scope: "screening",
    phase,
    message,
  };
  if (meta !== undefined) {
    Object.assign(payload, meta);
  }
  console.log(JSON.stringify(payload));
}

/**
 * Краткое описание ошибок Zod без значений полей.
 */
export function zodIssuesForLog(error: ZodError): Array<{ path: string; code: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    code: issue.code,
  }));
}
