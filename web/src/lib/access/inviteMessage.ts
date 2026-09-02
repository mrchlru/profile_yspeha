type Params = {
  serviceUrl: string;
  code: string;
  /** Уже отформатированная подпись срока действия (часовой пояс Москва). */
  validThrough?: string;
};

export function buildInviteCopyMessage(params: Params): string {
  const { serviceUrl, code, validThrough } = params;
  const lines = [
    "Здравствуйте.",
    "Направляю Вам приглашение и код для прохождения тестирования на специализированном on-line сервисе.",
    "",
    `Адрес сервиса: ${serviceUrl}`,
    "",
    `Ваш код: ${code}`,
  ];
  if (validThrough && validThrough.trim().length > 0) {
    lines.push("", `Код действует до: ${validThrough}.`);
  }
  lines.push("", "С уважением к Вам, MugleRest.");
  return lines.join("\n");
}

export function screeningEntryUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/`;
}
