import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { buildScreeningAiConclusionText } from "@/lib/ai/renderScreeningAiConclusion";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { escapeHtmlForPdf } from "@/lib/pdf/escapeHtml";

export type ScreeningReportEmailPayload = {
  sessionId: string;
  /** Для логов, без ПДн. */
  sessionRef: string;
  profileName: string;
  rawScore: number;
  maxScore: number;
  kotIp: number;
  kotIpLevelLabel: string;
  kotIpNormNote: string;
  conclusionText: string | null;
  hiringRecommendations: string | null;
  /** Вложение отчёта PDF, если сформировано. */
  reportPdfBuffer?: Buffer | null;
};

/**
 * Парсит список получателей из переменной окружения (через запятую).
 */
export function parseRecipientEmailsFromEnv(): string[] {
  const raw = process.env.REPORT_RECIPIENT_EMAILS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Унификация с MugleHR / Timeweb: поддержка SMTP_USER или SMTP_USERNAME, SMTP_PASS или SMTP_PASSWORD.
 */
function resolveSmtpAuth(): { user: string; pass: string } | null {
  const user =
    process.env.SMTP_USER?.trim() || process.env.SMTP_USERNAME?.trim() || "";
  const pass =
    process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim() || "";
  if (!user || !pass) {
    return null;
  }
  return { user, pass };
}

/**
 * Timeweb: smtp.timeweb.com не резолвится; рабочий хост — smtp.timeweb.ru (см. TIMEWEB_EMAIL_SETUP в референс-проекте).
 */
function normalizeSmtpHost(host: string): { host: string; corrected: boolean } {
  const trimmed = host.trim();
  if (trimmed.toLowerCase() === "smtp.timeweb.com") {
    return { host: "smtp.timeweb.ru", corrected: true };
  }
  return { host: trimmed, corrected: false };
}

/**
 * Для портов 465 (SSL с первого пакета) в Nodemailer нужно secure: true.
 * Для 587 — secure: false, далее STARTTLS.
 * Явный SMTP_SECURE=true принудительно включает SSL (редко нужно для 465).
 */
function resolveSecureFlag(port: number): boolean {
  if (process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1") {
    return true;
  }
  if (process.env.SMTP_SECURE === "false" || process.env.SMTP_SECURE === "0") {
    return false;
  }
  return port === 465;
}

/**
 * Timeweb SMTP: адрес From должен совпадать с логином; иначе часто 535 / обрыв.
 * Если задан EMAIL_FROM и он отличается — используем Reply-To (как в MugleHR email_service.py).
 */
function resolveFromAndReplyTo(authUser: string): {
  from: string;
  replyTo?: string;
} {
  const override = process.env.EMAIL_FROM?.trim();
  if (override && override.toLowerCase() !== authUser.toLowerCase()) {
    screeningServerLog("email", "from_coerced_to_smtp_user", {
      replyToUsed: true,
    });
    return { from: authUser, replyTo: override };
  }
  return { from: authUser };
}

function buildTransportOptions(
  host: string,
  port: number,
  secure: boolean,
  auth: { user: string; pass: string }
): SMTPTransport.Options {
  const timeoutMs = Number(process.env.SMTP_TIMEOUT_MS || "25000");
  return {
    host,
    port,
    secure,
    auth,
    requireTLS: port === 587,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    tls: {
      servername: host,
    },
  };
}

/**
 * Безопасные поля для логов при ошибке SMTP (без паролей).
 */
export function smtpErrorLogFields(err: unknown): {
  errorName: string;
  errorMessage: string;
  responseCode: number | null;
} {
  if (err instanceof Error) {
    const anyErr = err as Error & {
      responseCode?: number;
      code?: string;
    };
    const responseCode =
      typeof anyErr.responseCode === "number" ? anyErr.responseCode : null;
    const msg = err.message.slice(0, 800);
    return { errorName: err.name, errorMessage: msg, responseCode };
  }
  return {
    errorName: "unknown",
    errorMessage: String(err).slice(0, 800),
    responseCode: null,
  };
}

function isSmtpConfigured(): boolean {
  return resolveSmtpAuth() !== null && Boolean(process.env.SMTP_HOST?.trim());
}

/**
 * Отправляет письмо с результатами КОТ и заключением. Возвращает true при успехе.
 *
 * Рекомендуемая конфигурация Timeweb (как в MugleHR): SMTP_HOST=smtp.timeweb.ru,
 * SMTP_PORT=465, логин — полный email, пароль — от ящика; не задавайте EMAIL_FROM
 * отличным от логина или используйте Reply-To через EMAIL_FROM.
 */
export async function sendScreeningReportEmail(
  payload: ScreeningReportEmailPayload
): Promise<boolean> {
  const recipients = parseRecipientEmailsFromEnv();
  if (recipients.length === 0) {
    screeningServerLog("email", "skipped_no_recipients", { sessionRef: payload.sessionRef });
    return false;
  }
  if (!isSmtpConfigured()) {
    screeningServerLog("email", "skipped_no_smtp", { sessionRef: payload.sessionRef });
    return false;
  }

  const auth = resolveSmtpAuth();
  if (!auth) {
    screeningServerLog("email", "skipped_no_credentials", { sessionRef: payload.sessionRef });
    return false;
  }

  const rawHost = process.env.SMTP_HOST?.trim() || "";
  const { host, corrected } = normalizeSmtpHost(rawHost);
  if (!host) {
    screeningServerLog("email", "skipped_no_host", { sessionRef: payload.sessionRef });
    return false;
  }
  if (corrected) {
    screeningServerLog("email", "host_normalized_timeweb", {
      sessionRef: payload.sessionRef,
    });
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const secure = resolveSecureFlag(port);
  const { from, replyTo } = resolveFromAndReplyTo(auth.user);

  const transporter = nodemailer.createTransport(
    buildTransportOptions(host, port, secure, auth)
  );

  const pdfBytes =
    payload.reportPdfBuffer && payload.reportPdfBuffer.length > 0
      ? payload.reportPdfBuffer.length
      : 0;
  screeningServerLog("email", "send_start", {
    sessionRef: payload.sessionRef,
    recipientCount: recipients.length,
    port,
    secure,
    hostSuffix: host.includes(".") ? host.split(".").slice(-2).join(".") : host,
    replyToSet: Boolean(replyTo),
    pdfAttachmentBytes: pdfBytes,
  });

  const safeName = escapeHtmlForPdf(payload.profileName);
  const safeSession = escapeHtmlForPdf(payload.sessionId);
  const aiConclusion = buildScreeningAiConclusionText(
    payload.conclusionText,
    payload.hiringRecommendations
  );
  const conclusionBlock = `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtmlForPdf(
    aiConclusion
  )}</pre>`;

  const html = `
    <h1>Новая анкета «Профиль Успеха»</h1>
    <p><strong>Сессия:</strong> ${safeSession}</p>
    <p><strong>Профиль:</strong> ${safeName}</p>
    <p><strong>Сырой балл КОТ:</strong> ${String(payload.rawScore)} / ${String(
      payload.maxScore
    )}</p>
    <p><strong>Ип (число верных по КОТ):</strong> ${String(payload.kotIp)} / ${String(
      payload.maxScore
    )}</p>
    <p><strong>Уровень по методичке:</strong> ${escapeHtmlForPdf(payload.kotIpLevelLabel)}</p>
    <p><em>${escapeHtmlForPdf(payload.kotIpNormNote)}</em></p>
    <h2>Заключение (ИИ)</h2>
    ${conclusionBlock}
    <p><em>Полный отчёт с таблицами и графиками прилагается в формате PDF, если вложение сформировано.</em></p>
  `;

  const textLines = [
    `Сессия: ${payload.sessionId}`,
    `Профиль: ${payload.profileName}`,
    `Сырой балл КОТ: ${String(payload.rawScore)} / ${String(payload.maxScore)}`,
    `Ип (КОТ): ${String(payload.kotIp)} / ${String(payload.maxScore)}`,
    `Уровень: ${payload.kotIpLevelLabel}`,
    payload.kotIpNormNote,
    "",
    "Заключение (ИИ):",
    aiConclusion,
  ];

  const sendStarted = Date.now();
  const attachments =
    payload.reportPdfBuffer && payload.reportPdfBuffer.length > 0
      ? [
          {
            filename: `screening-report-${payload.sessionId}.pdf`,
            content: payload.reportPdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : undefined;

  try {
    await transporter.sendMail({
      from,
      to: recipients,
      replyTo,
      subject: `Профиль Успеха: анкета (${payload.profileName})`,
      text: textLines.join("\n"),
      html,
      attachments,
    });
  } catch (err) {
    const { errorName, errorMessage, responseCode } = smtpErrorLogFields(err);
    screeningServerLog("email", "send_failed", {
      sessionRef: payload.sessionRef,
      durationMs: Date.now() - sendStarted,
      errorName,
      errorMessage,
      responseCode: responseCode ?? undefined,
      port,
      secure,
    });
    throw err;
  }

  screeningServerLog("email", "send_ok", {
    sessionRef: payload.sessionRef,
    durationMs: Date.now() - sendStarted,
  });

  return true;
}
