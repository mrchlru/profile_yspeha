import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import {
  parseRecipientEmailsFromEnv,
  smtpErrorLogFields,
} from "@/lib/email/sendScreeningReportEmail";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export type AuditDevTextEmailPayload = {
  sessionId: string;
  sessionRef: string;
  fullName: string;
  textReport: string;
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
 * Отправляет DEV-отчёт аудита plain-text на почту HR (без PDF и без ИИ).
 */
export async function sendAuditDevTextEmail(
  payload: AuditDevTextEmailPayload
): Promise<boolean> {
  const recipients = parseRecipientEmailsFromEnv();
  if (recipients.length === 0) {
    screeningServerLog("email_audit_dev", "skipped_no_recipients", {
      sessionRef: payload.sessionRef,
    });
    return false;
  }
  if (!isSmtpConfigured()) {
    screeningServerLog("email_audit_dev", "skipped_no_smtp", {
      sessionRef: payload.sessionRef,
    });
    return false;
  }

  const auth = resolveSmtpAuth();
  if (!auth) {
    screeningServerLog("email_audit_dev", "skipped_no_credentials", {
      sessionRef: payload.sessionRef,
    });
    return false;
  }

  const rawHost = process.env.SMTP_HOST?.trim() || "";
  const { host } = normalizeSmtpHost(rawHost);
  if (!host) {
    screeningServerLog("email_audit_dev", "skipped_no_host", {
      sessionRef: payload.sessionRef,
    });
    return false;
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const secure = resolveSecureFlag(port);
  const { from, replyTo } = resolveFromAndReplyTo(auth.user);
  const transporter = nodemailer.createTransport(
    buildTransportOptions(host, port, secure, auth)
  );

  const sendStarted = Date.now();
  try {
    await transporter.sendMail({
      from,
      to: recipients,
      replyTo,
      subject: `[DEV] Аудит состояния: ${payload.fullName}`,
      text: payload.textReport,
    });
  } catch (err) {
    const { errorName, errorMessage, responseCode } = smtpErrorLogFields(err);
    screeningServerLog("email_audit_dev", "send_failed", {
      sessionRef: payload.sessionRef,
      durationMs: Date.now() - sendStarted,
      errorName,
      errorMessage,
      responseCode: responseCode ?? undefined,
    });
    throw err;
  }

  screeningServerLog("email_audit_dev", "send_ok", {
    sessionRef: payload.sessionRef,
    durationMs: Date.now() - sendStarted,
  });
  return true;
}
