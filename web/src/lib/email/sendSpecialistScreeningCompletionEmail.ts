import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import type { SpecialistScreeningInterpretation } from "@/lib/specialistScreening/specialistScreeningInterpretation";
import {
  parseRecipientEmailsFromEnv,
  smtpErrorLogFields,
} from "@/lib/email/sendScreeningReportEmail";
import { buildManagerAiConclusionText } from "@/lib/ai/renderManagerAiConclusion";
import { escapeHtmlForPdf } from "@/lib/pdf/escapeHtml";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type SpecialistScreeningCompletionEmailPayload = {
  sessionId: string;
  sessionRef: string;
  fullName: string;
  interpretation: SpecialistScreeningInterpretation;
  conclusionText?: string | null;
  managerActions?: string | null;
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
 * Письмо HR о завершении конфиденциального скрининга направления к специалисту.
 */
export async function sendSpecialistScreeningCompletionEmail(
  payload: SpecialistScreeningCompletionEmailPayload
): Promise<boolean> {
  const recipients = parseRecipientEmailsFromEnv();
  if (recipients.length === 0) {
    screeningServerLog("email_specialist_screening_completion", "skipped_no_recipients", {
      sessionRef: payload.sessionRef,
    });
    return false;
  }

  const auth = resolveSmtpAuth();
  const rawHost = process.env.SMTP_HOST?.trim() || "";
  if (!auth || !rawHost) {
    screeningServerLog("email_specialist_screening_completion", "skipped_no_smtp", {
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

  const { interpretation } = payload;
  const safeName = escapeHtmlForPdf(payload.fullName);
  const safeSession = escapeHtmlForPdf(payload.sessionId);
  const recommendations = interpretation.recommendationLines
    .map((line) => `<li>${escapeHtmlForPdf(line)}</li>`)
    .join("");

  const aiBlock =
    payload.conclusionText || payload.managerActions
      ? `<h2>Заключение ИИ</h2><pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtmlForPdf(
          buildManagerAiConclusionText(
            payload.conclusionText ?? null,
            payload.managerActions ?? null
          )
        )}</pre>`
      : "";

  const html = `
    <h1>Новое прохождение «Скрининг депрессивных симптомов»</h1>
    <p><em>Конфиденциально.</em></p>
    <p><strong>Сессия:</strong> ${safeSession}</p>
    <p><strong>Участник:</strong> ${safeName}</p>
    <h2>${escapeHtmlForPdf(interpretation.verdictTitle)}</h2>
    <p>${escapeHtmlForPdf(interpretation.verdictText)}</p>
    <h2>Шкалы</h2>
    <ul>
      <li>PHQ-9: ${String(interpretation.phq9.score)}/27 — ${escapeHtmlForPdf(interpretation.phq9.levelLabel)}</li>
      <li>GAD-7: ${String(interpretation.gad7.score)}/21 — ${escapeHtmlForPdf(interpretation.gad7.levelLabel)}</li>
      <li>ASRS: ${String(interpretation.asrs.score)}/6 — ${escapeHtmlForPdf(interpretation.asrs.levelLabel)}</li>
    </ul>
    ${recommendations ? `<h2>Рекомендации</h2><ul>${recommendations}</ul>` : ""}
    ${aiBlock}
    <p><em>Полный отчёт доступен в админ-панели: «Результаты тестирования».</em></p>
  `;

  const textLines = [
    "Конфиденциально.",
    `Сессия: ${payload.sessionId}`,
    `Участник: ${payload.fullName}`,
    "",
    interpretation.verdictTitle,
    interpretation.verdictText,
    "",
    `PHQ-9: ${String(interpretation.phq9.score)}/27 (${interpretation.phq9.levelLabel})`,
    `GAD-7: ${String(interpretation.gad7.score)}/21 (${interpretation.gad7.levelLabel})`,
    `ASRS: ${String(interpretation.asrs.score)}/6 (${interpretation.asrs.levelLabel})`,
    "",
    ...interpretation.recommendationLines,
    ...(payload.conclusionText || payload.managerActions
      ? [
          "",
          "Заключение ИИ:",
          buildManagerAiConclusionText(
            payload.conclusionText ?? null,
            payload.managerActions ?? null
          ),
        ]
      : []),
  ];

  const sendStarted = Date.now();
  try {
    await transporter.sendMail({
      from,
      to: recipients,
      replyTo,
      subject: `Скрининг депрессивных симптомов: ${payload.fullName}`,
      text: textLines.join("\n"),
      html,
    });
  } catch (err) {
    const { errorName, errorMessage, responseCode } = smtpErrorLogFields(err);
    screeningServerLog("email_specialist_screening_completion", "send_failed", {
      sessionRef: payload.sessionRef,
      durationMs: Date.now() - sendStarted,
      errorName,
      errorMessage,
      responseCode: responseCode ?? undefined,
    });
    throw err;
  }

  screeningServerLog("email_specialist_screening_completion", "send_ok", {
    sessionRef: payload.sessionRef,
    durationMs: Date.now() - sendStarted,
  });
  return true;
}
