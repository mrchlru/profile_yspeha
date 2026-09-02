export type FaqMenuItem =
  | {
      kind: "mailto";
      label: string;
      href: string;
    }
  | {
      kind: "link";
      label: string;
      href: string;
    };

/** Общая поддержка: ошибки в тестах, технические проблемы. */
export function resolveFaqSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@teleagentnn.ru";
}

/** Отдельная почта для проблем с кодом доступа (NEXT_PUBLIC_ACCESS_CODE_SUPPORT_EMAIL). */
export function resolveFaqAccessCodeSupportEmail(): string | null {
  const email = process.env.NEXT_PUBLIC_ACCESS_CODE_SUPPORT_EMAIL?.trim();
  return email && email.length > 0 ? email : null;
}

/** Собирает mailto с темой письма. */
export function buildFaqMailtoHref(email: string, subject: string): string {
  const params = new URLSearchParams({ subject });
  return `mailto:${email}?${params.toString()}`;
}

/** Пункты выпадающего FAQ в шапке. */
export function buildFaqMenuItems(): ReadonlyArray<FaqMenuItem> {
  const supportEmail = resolveFaqSupportEmail();
  const accessCodeEmail = resolveFaqAccessCodeSupportEmail();
  const items: FaqMenuItem[] = [
    {
      kind: "mailto",
      label: "Заметили ошибки в тестах — напишите нам!",
      href: buildFaqMailtoHref(supportEmail, "Ошибка в тестах — Screen Research"),
    },
  ];

  if (accessCodeEmail !== null) {
    items.push({
      kind: "mailto",
      label: "Не работает код доступа",
      href: buildFaqMailtoHref(accessCodeEmail, "Код доступа — Screen Research"),
    });
  }

  items.push(
    {
      kind: "mailto",
      label: "Технические проблемы",
      href: buildFaqMailtoHref(supportEmail, "Техническая проблема — Screen Research"),
    },
    {
      kind: "link",
      label: "Политика обработки персональных данных",
      href: "/policy",
    }
  );

  return items;
}
