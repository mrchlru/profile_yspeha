import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import {
  parseRecipientEmailsFromEnv,
  smtpErrorLogFields,
} from "@/lib/email/sendScreeningReportEmail";
import { escapeHtmlForPdf } from "@/lib/pdf/escapeHtml";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type ProfSbEducationCompletionEmailPayload = {
  sessionId: string;
  sessionRef: string;
  fullName: string;
  summaryText: string | null;
};

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

function normalizeSmtpHost(host: string): { host: string } {
  const trimmed = host.trim();
  if (trimmed.toLowerCase() === "smtp.timeweb.com") {
    return { host: "smtp.timeweb.ru" };
  }
  return { host: trimmed };
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
    tls: { servername: host },
  };
}

/**
 * Письмо HR о завершении анкеты «ПРОФ СБ + ПРОФ образование».
 */
export async function sendProfSbEducationCompletionEmail(
  payload: ProfSbEducationCompletionEmailPayload
): Promise<boolean> {
  const recipients = parseRecipientEmailsFromEnv();
  if (recipients.length === 0) {
    screeningServerLog("email_prof_sb_education", "skipped_no_recipients", {
      sessionRef: payload.sessionRef,
    });
    return false;
  }

  const auth = resolveSmtpAuth();
  const rawHost = process.env.SMTP_HOST?.trim() || "";
  if (!auth || !rawHost) {
    screeningServerLog("email_prof_sb_education", "skipped_no_smtp", {
      sessionRef: payload.sessionRef,
    });
    return false;
  }

  const { host } = normalizeSmtpHost(rawHost);
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = resolveSecureFlag(port);
  const { from, replyTo } = resolveFromAndReplyTo(auth.user);
  const transporter = nodemailer.createTransport(
    buildTransportOptions(host, port, secure, auth)
  );

  const safeName = escapeHtmlForPdf(payload.fullName);
  const safeSession = escapeHtmlForPdf(payload.sessionId);
  const summaryBlock =
    payload.summaryText && payload.summaryText.trim().length > 0
      ? `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtmlForPdf(
          payload.summaryText.trim().slice(0, 4000)
        )}</pre>`
      : "<p>Краткое резюме анкеты недоступно.</p>";

  const html = `
    <h1>Новое прохождение «ПРОФ СБ + ПРОФ образование»</h1>
    <p><strong>Сессия:</strong> ${safeSession}</p>
    <p><strong>Участник:</strong> ${safeName}</p>
    <h2>Краткое резюме</h2>
    ${summaryBlock}
    <p><em>Полные данные доступны в админ-панели: «Результаты тестирования».</em></p>
  `;

  const textLines = [
    `Сессия: ${payload.sessionId}`,
    `Участник: ${payload.fullName}`,
    "",
    "Краткое резюме:",
    payload.summaryText?.trim() || "(нет)",
  ];

  const sendStarted = Date.now();
  try {
    await transporter.sendMail({
      from,
      to: recipients,
      replyTo,
      subject: `ПРОФ СБ + образование: ${payload.fullName}`,
      text: textLines.join("\n"),
      html,
    });
  } catch (err) {
    const { errorName, errorMessage, responseCode } = smtpErrorLogFields(err);
    screeningServerLog("email_prof_sb_education", "send_failed", {
      sessionRef: payload.sessionRef,
      durationMs: Date.now() - sendStarted,
      errorName,
      errorMessage,
      responseCode: responseCode ?? undefined,
    });
    throw err;
  }

  screeningServerLog("email_prof_sb_education", "send_ok", {
    sessionRef: payload.sessionRef,
    durationMs: Date.now() - sendStarted,
  });
  return true;
}
