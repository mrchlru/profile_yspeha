import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { stripAiReportSectionMarkers } from "@/lib/report/reportAiSectionLayout";
import {
  parseRecipientEmailsFromEnv,
  smtpErrorLogFields,
} from "@/lib/email/sendScreeningReportEmail";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { escapeHtmlForPdf } from "@/lib/pdf/escapeHtml";

export type AuditReportEmailPayload = {
  sessionId: string;
  sessionRef: string;
  fullName: string;
  conclusionText: string | null;
  yearOverYearText: string | null;
  reportPdfBuffer?: Buffer | null;
};

/**
 * Достаёт SMTP-логин/пароль (как в письме скрининга).
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

function normalizeSmtpHost(host: string): { host: string; corrected: boolean } {
  const trimmed = host.trim();
  if (trimmed.toLowerCase() === "smtp.timeweb.com") {
    return { host: "smtp.timeweb.ru", corrected: true };
  }
  return { host: trimmed, corrected: false };
}

function resolveSecureFlag(port: number): boolean {
  if (process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1") {
    return true;
  }
  if (process.env.SMTP_SECURE === "false" || process.env.SMTP_SECURE === "0") {
    return false;
  }
  return port === 465;
}

function resolveFromAndReplyTo(authUser: string): {
  from: string;
  replyTo?: string;
} {
  const override = process.env.EMAIL_FROM?.trim();
  if (override && override.toLowerCase() !== authUser.toLowerCase()) {
    screeningServerLog("email_audit", "from_coerced_to_smtp_user", {
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

function isSmtpConfigured(): boolean {
  return resolveSmtpAuth() !== null && Boolean(process.env.SMTP_HOST?.trim());
}

/**
 * Отправляет письмо HR с заключением по аудиту состояния и вложенным PDF (если есть).
 */
export async function sendAuditReportEmail(payload: AuditReportEmailPayload): Promise<boolean> {
  const recipients = parseRecipientEmailsFromEnv();
  if (recipients.length === 0) {
    screeningServerLog("email_audit", "skipped_no_recipients", { sessionRef: payload.sessionRef });
    return false;
  }
  if (!isSmtpConfigured()) {
    screeningServerLog("email_audit", "skipped_no_smtp", { sessionRef: payload.sessionRef });
    return false;
  }

  const auth = resolveSmtpAuth();
  if (!auth) {
    screeningServerLog("email_audit", "skipped_no_credentials", { sessionRef: payload.sessionRef });
    return false;
  }

  const rawHost = process.env.SMTP_HOST?.trim() || "";
  const { host, corrected } = normalizeSmtpHost(rawHost);
  if (!host) {
    screeningServerLog("email_audit", "skipped_no_host", { sessionRef: payload.sessionRef });
    return false;
  }
  if (corrected) {
    screeningServerLog("email_audit", "host_normalized_timeweb", {
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
  screeningServerLog("email_audit", "send_start", {
    sessionRef: payload.sessionRef,
    recipientCount: recipients.length,
    port,
    secure,
    hostSuffix: host.includes(".") ? host.split(".").slice(-2).join(".") : host,
    replyToSet: Boolean(replyTo),
    pdfAttachmentBytes: pdfBytes,
  });

  const safeName = escapeHtmlForPdf(payload.fullName);
  const safeSession = escapeHtmlForPdf(payload.sessionId);
  const conclusionPlain =
    payload.conclusionText !== null
      ? stripAiReportSectionMarkers(payload.conclusionText)
      : null;
  const conclusionBlock =
    conclusionPlain !== null
      ? `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtmlForPdf(
          conclusionPlain
        )}</pre>`
      : "<p>Заключение не сгенерировано (нет OPENAI_API_KEY или ошибка модели).</p>";

  const dynBlock =
    payload.yearOverYearText !== null
      ? `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtmlForPdf(
          payload.yearOverYearText
        )}</pre>`
      : "<p>Блок динамики год-к-году не сгенерирован.</p>";

  const html = `
    <h1>Новое прохождение «Аудит состояния»</h1>
    <p><strong>Сессия:</strong> ${safeSession}</p>
    <p><strong>Участник:</strong> ${safeName}</p>
    <h2>Заключение</h2>
    ${conclusionBlock}
    <h2>Динамика год-к-году</h2>
    ${dynBlock}
    <p><em>Полный отчёт прилагается в PDF при успешной генерации вложения.</em></p>
  `;

  const textLines = [
    `Сессия: ${payload.sessionId}`,
    `Участник: ${payload.fullName}`,
    "",
    "Заключение:",
    conclusionPlain ?? "(не сгенерировано)",
    "",
    "Динамика:",
    payload.yearOverYearText ?? "(не сгенерировано)",
  ];

  const attachments =
    payload.reportPdfBuffer && payload.reportPdfBuffer.length > 0
      ? [
          {
            filename: `audit-report-${payload.sessionId}.pdf`,
            content: payload.reportPdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : undefined;

  const sendStarted = Date.now();
  try {
    await transporter.sendMail({
      from,
      to: recipients,
      replyTo,
      subject: `Аудит состояния: ${payload.fullName}`,
      text: textLines.join("\n"),
      html,
      attachments,
    });
  } catch (err) {
    const { errorName, errorMessage, responseCode } = smtpErrorLogFields(err);
    screeningServerLog("email_audit", "send_failed", {
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

  screeningServerLog("email_audit", "send_ok", {
    sessionRef: payload.sessionRef,
    durationMs: Date.now() - sendStarted,
  });

  return true;
}
