type Params = {
  serviceUrl: string;
  code: string;
  /** Уже отформатированная подпись срока действия (часовой пояс Москва). */
  validThrough?: string;
};

/**
 * Текст приглашения для копирования (ссылка уже с кодом + код дублируется отдельно).
 */
export function buildInviteCopyMessage(params: Params): string {
  const { serviceUrl, code, validThrough } = params;
  const lines = [
    "Здравствуйте.",
    "Направляю Вам приглашение и код для прохождения тестирования на специализированном on-line сервисе.",
    "",
    `Ссылка для входа: ${serviceUrl}`,
    "",
    `Ваш код: ${code}`,
  ];
  if (validThrough && validThrough.trim().length > 0) {
    lines.push("", `Код действует до: ${validThrough}.`);
  }
  lines.push("", "С уважением к Вам, MugleRest.");
  return lines.join("\n");
}

/**
 * Базовый URL сервиса (корень).
 */
export function screeningEntryUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/`;
}

/**
 * Ссылка на вход с подставленным кодом приглашения (`/?code=…`).
 */
export function inviteEntryUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, "");
  const normalized = code.trim();
  if (normalized.length === 0) {
    return `${base}/`;
  }
  return `${base}/?code=${encodeURIComponent(normalized)}`;
}
