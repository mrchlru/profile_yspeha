import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import type { MaslachBurnoutCriticalSummary } from "@/lib/burnout/maslachBurnoutCritical";
import { formatMaslachCriticalScaleLines } from "@/lib/burnout/maslachBurnoutCritical";
import { BURNOUT_REMINDER_TRIGGER_SUBMISSION_HIGH } from "@/lib/burnout/burnoutReminderSchedule";
import { smtpErrorLogFields } from "@/lib/email/sendScreeningReportEmail";
import { escapeHtmlForPdf } from "@/lib/pdf/escapeHtml";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type BurnoutRetestReminderEmailPayload = {
  to: ReadonlyArray<string>;
  personName: string;
  triggerKind: string;
  maslachCritical: MaslachBurnoutCriticalSummary | null;
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
 * Отправляет напоминание HRD/админу о необходимости повторного теста на выгорание.
 */
export async function sendBurnoutRetestReminderEmail(
  payload: BurnoutRetestReminderEmailPayload
): Promise<boolean> {
  if (payload.to.length === 0) {
    return false;
  }

  const auth = resolveSmtpAuth();
  const rawHost = process.env.SMTP_HOST?.trim() || "";
  if (!auth || !rawHost) {
    screeningServerLog("email_burnout_retest", "skipped_no_smtp", {
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

  const isHighResult =
    payload.triggerKind === BURNOUT_REMINDER_TRIGGER_SUBMISSION_HIGH ||
    payload.maslachCritical?.critical === true;
  const scaleLines =
    payload.maslachCritical !== null
      ? formatMaslachCriticalScaleLines(payload.maslachCritical)
      : [];

  const subject = `Повторный тест на выгорание: ${payload.personName}`;
  const textParts = [
    "Напоминание: назначьте повторное тестирование на выгорание (опросник Маслач).",
    `Сотрудник: ${payload.personName}`,
    "Создайте приглашение в админ-панели: «Создать тест» → «Тест на выгорание».",
  ];
  if (isHighResult && scaleLines.length > 0) {
    textParts.push("Последние результаты — повышенные показатели выгорания:");
    textParts.push(...scaleLines);
    textParts.push(
      "Рекомендуется повторное тестирование через 3 месяца до стабилизации показателей."
    );
  } else {
    textParts.push(
      "Если показатели в норме и повторное тестирование не требуется — новое приглашение можно не создавать."
    );
  }
  const text = textParts.join("\n");

  const scaleHtml =
    scaleLines.length > 0
      ? `<ul>${scaleLines.map((line) => `<li>${escapeHtmlForPdf(line)}</li>`).join("")}</ul>`
      : "";

  const html = `
    <h1 style="color:#007A68">Повторный тест на выгорание</h1>
    <p>Прошло 3 месяца с момента назначения или последнего теста на выгорание.</p>
    <ul>
      <li><strong>Сотрудник:</strong> ${escapeHtmlForPdf(payload.personName)}</li>
    </ul>
    <p>Назначьте повторное тестирование в админ-панели: <strong>Создать тест → Тест на выгорание</strong>.</p>
    ${
      isHighResult && scaleHtml
        ? `<p><strong>Последние результаты — повышенное выгорание:</strong></p>${scaleHtml}<p>Цепочка напоминаний продолжится, пока показатели остаются высокими или не назначен контрольный тест.</p>`
        : `<p>Если показатели в норме и повтор не нужен — цепочка напоминаний завершится автоматически.</p>`
    }
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
    screeningServerLog("email_burnout_retest", "send_ok", {
      sessionRef: payload.sessionRef,
      recipientCount: payload.to.length,
    });
    return true;
  } catch (err) {
    screeningServerLog("email_burnout_retest", "send_failed", smtpErrorLogFields(err));
    return false;
  }
}
