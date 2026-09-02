import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { smtpErrorLogFields } from "@/lib/email/sendScreeningReportEmail";
import { escapeHtmlForPdf } from "@/lib/pdf/escapeHtml";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type PiExhaustionAlertEmailPayload = {
  to: ReadonlyArray<string>;
  personName: string;
  testLabel: string;
  piScore: number;
  piBandLabel: string;
  sessionRef: string;
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
 * Отправляет уведомление о критическом психоэмоциональном истощении (ПИ).
 */
export async function sendPiExhaustionAlertEmail(
  payload: PiExhaustionAlertEmailPayload
): Promise<boolean> {
  if (payload.to.length === 0) {
    return false;
  }

  const auth = resolveSmtpAuth();
  const rawHost = process.env.SMTP_HOST?.trim() || "";
  if (!auth || !rawHost) {
    screeningServerLog("email_pi_alert", "skipped_no_smtp", {
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

  const subject = `Высокое психоэмоциональное истощение: ${payload.personName}`;
  const text = [
    "Обнаружено критически высокое психоэмоциональное истощение (ПИ).",
    `Участник: ${payload.personName}`,
    `Тест: ${payload.testLabel}`,
    `ПИ: ${String(payload.piScore)} (${payload.piBandLabel})`,
    "Порог: 40 баллов и выше (высокий или крайне высокий уровень).",
    "",
    "Рекомендуется назначить сотруднику тест на выгорание (опросник Маслач).",
    "Создайте приглашение в админ-панели: «Создать тест» → «Тест на выгорание».",
    "После назначения теста система напомнит о повторном тестировании через 3 месяца.",
    "",
    "Проверьте полный отчёт в админ-панели.",
  ].join("\n");

  const html = `
    <h1 style="color:#c62828">Высокое психоэмоциональное истощение (ПИ)</h1>
    <p>У участника тестирования зафиксирован <strong>критически высокий</strong> показатель психоэмоционального истощения.</p>
    <ul>
      <li><strong>Участник:</strong> ${escapeHtmlForPdf(payload.personName)}</li>
      <li><strong>Тест:</strong> ${escapeHtmlForPdf(payload.testLabel)}</li>
      <li><strong>ПИ:</strong> <span style="color:#c62828;font-weight:bold">${String(payload.piScore)}</span> (${escapeHtmlForPdf(payload.piBandLabel)})</li>
    </ul>
    <p>Порог срабатывания: 40 баллов и выше.</p>
    <p style="margin-top:16px"><strong>Рекомендуется назначить тест на выгорание (Маслач).</strong><br/>
    В админ-панели: <em>Создать тест → Тест на выгорание</em>.<br/>
    Через 3 месяца после назначения придёт напоминание о повторном тестировании.</p>
  `;

  try {
    await transporter.sendMail({
      from,
      to: [...payload.to],
      replyTo,
      subject,
      text,
      html,
    });
    screeningServerLog("email_pi_alert", "send_ok", {
      sessionRef: payload.sessionRef,
      recipientCount: payload.to.length,
    });
    return true;
  } catch (err) {
    screeningServerLog("email_pi_alert", "send_failed", smtpErrorLogFields(err));
    return false;
  }
}
