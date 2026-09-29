import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import {
  parseRecipientEmailsFromEnv,
  smtpErrorLogFields,
} from "@/lib/email/sendScreeningReportEmail";
import { escapeHtmlForPdf } from "@/lib/pdf/escapeHtml";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type SpecialistScreeningUrgentAlertEmailPayload = {
  sessionId: string;
  sessionRef: string;
  fullName: string;
  phq9Item9Score: number;
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
 * Срочный конфиденциальный алерт при положительном ответе на вопрос 9 PHQ-9.
 */
export async function sendSpecialistScreeningUrgentAlertEmail(
  payload: SpecialistScreeningUrgentAlertEmailPayload
): Promise<boolean> {
  const recipients = parseRecipientEmailsFromEnv();
  if (recipients.length === 0) {
    screeningServerLog("email_specialist_screening_urgent", "skipped_no_recipients", {
      sessionRef: payload.sessionRef,
    });
    return false;
  }

  const auth = resolveSmtpAuth();
  const rawHost = process.env.SMTP_HOST?.trim() || "";
  if (!auth || !rawHost) {
    screeningServerLog("email_specialist_screening_urgent", "skipped_no_smtp", {
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

  const subject = `СРОЧНО / КОНФИДЕНЦИАЛЬНО: PHQ-9 п.9 — ${payload.fullName}`;
  const text = [
    "СРОЧНО. КОНФИДЕНЦИАЛЬНО.",
    "",
    "В скрининге депрессивных симптомов ответ на вопрос 9 PHQ-9 отличается от «Никогда».",
    "Это сигнал для немедленного, а не планового действия.",
    "",
    `Участник: ${payload.fullName}`,
    `Сессия: ${payload.sessionId}`,
    `Балл по п.9: ${String(payload.phq9Item9Score)} (0 = никогда, 1–3 = положительный ответ)`,
    "",
    "Организуйте конфиденциальный разговор в тот же день.",
    "Предложите сопровождение к психиатру/психотерапевту или горячую линию 8-800-2000-122.",
    "Не оставляйте ответ «на потом» и не передавайте информацию никому, кроме врача, ведущего сопровождение.",
    "",
    "Отчёт доступен в админ-панели: «Результаты тестирования».",
  ].join("\n");

  const html = `
    <h1 style="color:#c62828">СРОЧНО · КОНФИДЕНЦИАЛЬНО</h1>
    <p>В скрининге депрессивных симптомов ответ на <strong>вопрос 9 PHQ-9</strong>
    (мысли о смерти / причинении себе вреда) отличается от «Никогда».</p>
    <p>Это <strong>не статистика</strong>, а сигнал для немедленного действия в тот же день.</p>
    <ul>
      <li><strong>Участник:</strong> ${escapeHtmlForPdf(payload.fullName)}</li>
      <li><strong>Сессия:</strong> ${escapeHtmlForPdf(payload.sessionId)}</li>
      <li><strong>Балл по п.9:</strong> <span style="color:#c62828;font-weight:bold">${String(payload.phq9Item9Score)}</span></li>
    </ul>
    <p><strong>Сделайте сейчас:</strong></p>
    <ol>
      <li>Конфиденциальный разговор в тот же день.</li>
      <li>Сопровождение к специалисту или горячая линия 8-800-2000-122.</li>
      <li>Не передавайте информацию никому, кроме врача, ведущего сопровождение.</li>
    </ol>
  `;

  try {
    await transporter.sendMail({
      from,
      to: recipients,
      replyTo,
      subject,
      text,
      html,
    });
    screeningServerLog("email_specialist_screening_urgent", "send_ok", {
      sessionRef: payload.sessionRef,
      recipientCount: recipients.length,
    });
    return true;
  } catch (err) {
    screeningServerLog("email_specialist_screening_urgent", "send_failed", smtpErrorLogFields(err));
    return false;
  }
}
