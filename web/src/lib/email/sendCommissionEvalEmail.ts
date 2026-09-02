import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { smtpErrorLogFields } from "@/lib/email/sendScreeningReportEmail";
import { escapeHtmlForPdf } from "@/lib/pdf/escapeHtml";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type CommissionEvalEmailPayload = {
  to: string;
  memberName: string;
  candidateName: string;
  vacancyTitle: string;
  evalUrl: string;
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
 * Отправляет участнику комиссии ссылку на оценочный лист.
 */
export async function sendCommissionEvalEmail(
  payload: CommissionEvalEmailPayload
): Promise<boolean> {
  if (!isSmtpConfigured()) {
    screeningServerLog("email_commission", "skipped_no_smtp", {
      toDomain: payload.to.split("@")[1],
    });
    return false;
  }

  const auth = resolveSmtpAuth();
  if (!auth) {
    return false;
  }

  const rawHost = process.env.SMTP_HOST?.trim() || "";
  const { host } = normalizeSmtpHost(rawHost);
  if (!host) {
    return false;
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const secure = resolveSecureFlag(port);
  const { from, replyTo } = resolveFromAndReplyTo(auth.user);
  const transporter = nodemailer.createTransport(
    buildTransportOptions(host, port, secure, auth)
  );

  const html = `
    <h1>Оценочный лист комиссии</h1>
    <p>Здравствуйте, ${escapeHtmlForPdf(payload.memberName)}!</p>
    <p>Вас пригласили в комиссию по собеседованию кандидата <strong>${escapeHtmlForPdf(payload.candidateName)}</strong> на вакансию <strong>${escapeHtmlForPdf(payload.vacancyTitle)}</strong>.</p>
    <p>В вашей персональной папке доступны резюме кандидата (если загружено) и анкета оценки.</p>
    <p><a href="${escapeHtmlForPdf(payload.evalUrl)}">Открыть оценочный лист</a></p>
    <p>После заполнения нажмите «Отправить» — изменить анкету будет нельзя.</p>
  `;

  const text = [
    `Здравствуйте, ${payload.memberName}!`,
    `Кандидат: ${payload.candidateName}`,
    `Вакансия: ${payload.vacancyTitle}`,
    `Ссылка на оценочный лист: ${payload.evalUrl}`,
  ].join("\n");

  try {
    await transporter.sendMail({
      from,
      to: payload.to,
      replyTo,
      subject: `Оценочный лист: ${payload.candidateName}`,
      text,
      html,
    });
    screeningServerLog("email_commission", "send_ok", { toDomain: payload.to.split("@")[1] });
    return true;
  } catch (err) {
    const fields = smtpErrorLogFields(err);
    screeningServerLog("email_commission", "send_failed", fields);
    return false;
  }
}
