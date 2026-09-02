import { readAdminAuthConfig } from "@/lib/admin/adminAuthConfig";
import { prisma } from "@/lib/prisma";

export type PiExhaustionNotificationSettings = {
  notifyAdmin: boolean;
  notifyHrd: boolean;
  /** Сырой ввод списка доп. почт (для формы). */
  notifyExtraEmailsRaw: string;
  updatedAt: string | null;
};

const SETTINGS_ID = "default";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Разбирает строку с адресами (запятая, точка с запятой или перенос строки).
 */
export function parsePiExhaustionExtraEmails(raw: string): ReadonlyArray<string> {
  const parts = raw
    .split(/[,;\n\r]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.includes(part)) {
      unique.push(part);
    }
  }
  return unique;
}

/**
 * Проверяет список доп. адресов; возвращает текст ошибки или null.
 */
export function validatePiExhaustionExtraEmailsRaw(raw: string): string | null {
  const emails = parsePiExhaustionExtraEmails(raw);
  for (const email of emails) {
    if (!EMAIL_PATTERN.test(email)) {
      return `Некорректный адрес: ${email}`;
    }
  }
  if (raw.length > 4000) {
    return "Список адресов слишком длинный.";
  }
  return null;
}

/**
 * Возвращает настройки уведомлений о критическом ПИ (создаёт строку по умолчанию).
 */
export async function getPiExhaustionNotificationSettings(): Promise<PiExhaustionNotificationSettings> {
  const row = await prisma.adminAppSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      piExhaustionNotifyAdmin: true,
      piExhaustionNotifyHrd: true,
      piExhaustionNotifyExtraEmails: "",
    },
    update: {},
    select: {
      piExhaustionNotifyAdmin: true,
      piExhaustionNotifyHrd: true,
      piExhaustionNotifyExtraEmails: true,
      updatedAt: true,
    },
  });

  return {
    notifyAdmin: row.piExhaustionNotifyAdmin,
    notifyHrd: row.piExhaustionNotifyHrd,
    notifyExtraEmailsRaw: row.piExhaustionNotifyExtraEmails,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Обновляет настройки уведомлений о критическом ПИ.
 */
export async function updatePiExhaustionNotificationSettings(input: {
  notifyAdmin: boolean;
  notifyHrd: boolean;
  notifyExtraEmailsRaw: string;
}): Promise<PiExhaustionNotificationSettings> {
  const validationError = validatePiExhaustionExtraEmailsRaw(input.notifyExtraEmailsRaw);
  if (validationError !== null) {
    throw new PiExhaustionNotificationSettingsValidationError(validationError);
  }

  const normalizedRaw = parsePiExhaustionExtraEmails(input.notifyExtraEmailsRaw).join("\n");

  const row = await prisma.adminAppSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      piExhaustionNotifyAdmin: input.notifyAdmin,
      piExhaustionNotifyHrd: input.notifyHrd,
      piExhaustionNotifyExtraEmails: normalizedRaw,
    },
    update: {
      piExhaustionNotifyAdmin: input.notifyAdmin,
      piExhaustionNotifyHrd: input.notifyHrd,
      piExhaustionNotifyExtraEmails: normalizedRaw,
    },
    select: {
      piExhaustionNotifyAdmin: true,
      piExhaustionNotifyHrd: true,
      piExhaustionNotifyExtraEmails: true,
      updatedAt: true,
    },
  });

  return {
    notifyAdmin: row.piExhaustionNotifyAdmin,
    notifyHrd: row.piExhaustionNotifyHrd,
    notifyExtraEmailsRaw: row.piExhaustionNotifyExtraEmails,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PiExhaustionNotificationSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PiExhaustionNotificationSettingsValidationError";
  }
}

/**
 * Собирает список почт для алерта о критическом ПИ.
 */
export async function resolvePiExhaustionAlertRecipients(): Promise<string[]> {
  const [settings, hrd] = await Promise.all([
    getPiExhaustionNotificationSettings(),
    prisma.hrdAccount.findFirst({
      orderBy: { createdAt: "asc" },
      select: { email: true },
    }),
  ]);

  const recipients = new Set<string>();

  if (settings.notifyAdmin) {
    const adminConfig = readAdminAuthConfig();
    if (adminConfig?.adminEmail) {
      recipients.add(adminConfig.adminEmail.trim().toLowerCase());
    }
  }

  if (settings.notifyHrd && hrd?.email) {
    recipients.add(hrd.email.trim().toLowerCase());
  }

  for (const email of parsePiExhaustionExtraEmails(settings.notifyExtraEmailsRaw)) {
    recipients.add(email);
  }

  return [...recipients];
}
