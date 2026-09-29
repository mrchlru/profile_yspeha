import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import type { AttestationComputedScores } from "@/lib/attestation/computeAttestationScores";
import type { KlimovProfessionType, MiniIpipFactor } from "@/lib/attestation/attestationQuestions";
import {
  parseRecipientEmailsFromEnv,
  smtpErrorLogFields,
} from "@/lib/email/sendScreeningReportEmail";
import { escapeHtmlForPdf } from "@/lib/pdf/escapeHtml";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type AttestationCompletionEmailPayload = {
  sessionId: string;
  sessionRef: string;
  fullName: string;
  scores: AttestationComputedScores;
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

const MINI_IPIP_LABELS: Record<MiniIpipFactor, string> = {
  Extraversion: "Экстраверсия",
  Agreeableness: "Доброжелательность",
  Conscientiousness: "Добросовестность",
  Neuroticism: "Нейротизм",
  Openness: "Открытость",
};

const MP_SCALE_LABELS: Record<string, string> = {
  decision_making: "Принятие решений",
  delegation: "Делегирование",
  stress_resilience: "Стрессоустойчивость",
  team_leadership: "Лидерство в команде",
  integrity: "Деловая этика",
};

const KLIMOV_LABELS: Record<KlimovProfessionType, string> = {
  human_nature: "Человек — природа",
  human_technique: "Человек — техника",
  human_human: "Человек — человек",
  human_sign_system: "Человек — знаковая система",
  human_artistic_image: "Человек — художественный образ",
};

function _topKlimovType(scores: AttestationComputedScores["klimovDdo"]): string {
  let top: KlimovProfessionType = "human_nature";
  let max = -1;
  for (const [key, value] of Object.entries(scores) as [KlimovProfessionType, number][]) {
    if (value > max) {
      max = value;
      top = key;
    }
  }
  return `${KLIMOV_LABELS[top]} (${String(max)})`;
}

/**
 * Письмо HR о завершении аттестации управляющего / шеф-повара.
 */
export async function sendAttestationCompletionEmail(
  payload: AttestationCompletionEmailPayload
): Promise<boolean> {
  const recipients = parseRecipientEmailsFromEnv();
  if (recipients.length === 0) {
    screeningServerLog("email_attestation_completion", "skipped_no_recipients", {
      sessionRef: payload.sessionRef,
    });
    return false;
  }

  const auth = resolveSmtpAuth();
  const rawHost = process.env.SMTP_HOST?.trim() || "";
  if (!auth || !rawHost) {
    screeningServerLog("email_attestation_completion", "skipped_no_smtp", {
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

  const { scores } = payload;
  const safeName = escapeHtmlForPdf(payload.fullName);
  const safeSession = escapeHtmlForPdf(payload.sessionId);

  const bigFiveLines = (Object.keys(scores.miniIpip) as MiniIpipFactor[]).map(
    (factor) =>
      `<li>${escapeHtmlForPdf(MINI_IPIP_LABELS[factor])}: ${String(scores.miniIpip[factor])}</li>`
  );

  const mpLines = scores.managementPotential.map(
    (row) =>
      `<li>${escapeHtmlForPdf(MP_SCALE_LABELS[row.scale] ?? row.scale)}: ${String(row.sum)} (${row.band})</li>`
  );

  const cbiLines = scores.cbi.map(
    (row) =>
      `<li>${row.scale === "personal" ? "Личное истощение" : "Рабочее истощение"}: ${row.mean.toFixed(1)} (${row.band})</li>`
  );

  const spLines = scores.spielberger.map(
    (row) =>
      `<li>${row.scale === "state" ? "Ситуативная тревожность (ST)" : "Личностная тревожность (LT)"}: ${String(row.total)} (${row.band})</li>`
  );

  const luscherLine =
    scores.luscher !== null
      ? `SO ${scores.luscher.so.toFixed(1)}, VK ${scores.luscher.vk.toFixed(2)}`
      : "—";

  const html = `
    <h1>Аттестация завершена</h1>
    <p><strong>Сессия:</strong> ${safeSession}</p>
    <p><strong>Участник:</strong> ${safeName}</p>
    <h2>Big Five (Mini-IPIP)</h2>
    <ul>${bigFiveLines.join("")}</ul>
    <h2>Управленческий потенциал</h2>
    <ul>${mpLines.join("")}</ul>
    <h2>CBI (выгорание)</h2>
    <ul>${cbiLines.join("")}</ul>
    <h2>Шпилбергер</h2>
    <ul>${spLines.join("")}</ul>
    <h2>ДДО Климова</h2>
    <p>Лидирующий тип: ${escapeHtmlForPdf(_topKlimovType(scores.klimovDdo))}</p>
    <h2>Люшер</h2>
    <p>${escapeHtmlForPdf(luscherLine)}</p>
    <p><em>Полный отчёт и кодирование Розенцвейга — в админ-панели «Результаты тестирования».</em></p>
  `;

  const textLines = [
    "Аттестация завершена",
    `Сессия: ${payload.sessionId}`,
    `Участник: ${payload.fullName}`,
    "",
    "Big Five:",
    ...(Object.keys(scores.miniIpip) as MiniIpipFactor[]).map(
      (f) => `- ${MINI_IPIP_LABELS[f]}: ${String(scores.miniIpip[f])}`
    ),
    "",
    "Управленческий потенциал:",
    ...scores.managementPotential.map(
      (r) => `- ${MP_SCALE_LABELS[r.scale] ?? r.scale}: ${String(r.sum)}`
    ),
    "",
    "CBI:",
    ...scores.cbi.map(
      (r) =>
        `- ${r.scale === "personal" ? "личное" : "рабочее"}: ${r.mean.toFixed(1)}`
    ),
    "",
    "Шпилбергер:",
    ...scores.spielberger.map(
      (r) => `- ${r.scale === "state" ? "ST" : "LT"}: ${String(r.total)}`
    ),
    "",
    `Климов (топ): ${_topKlimovType(scores.klimovDdo)}`,
    `Люшер: ${luscherLine}`,
  ];

  const sendStarted = Date.now();
  try {
    await transporter.sendMail({
      from,
      to: recipients,
      replyTo,
      subject: `Аттестация завершена: ${payload.fullName}`,
      text: textLines.join("\n"),
      html,
    });
  } catch (err) {
    const { errorName, errorMessage, responseCode } = smtpErrorLogFields(err);
    screeningServerLog("email_attestation_completion", "send_failed", {
      sessionRef: payload.sessionRef,
      durationMs: Date.now() - sendStarted,
      errorName,
      errorMessage,
      responseCode: responseCode ?? undefined,
    });
    throw err;
  }

  screeningServerLog("email_attestation_completion", "send_ok", {
    sessionRef: payload.sessionRef,
    durationMs: Date.now() - sendStarted,
  });
  return true;
}
