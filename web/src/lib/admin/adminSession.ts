import type { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_ROLE_ADMIN,
  ADMIN_ROLE_HRD,
  isAdminRole,
  type AdminRole,
  type AdminSessionUser,
} from "@/lib/admin/adminRoles";

export const ADMIN_SESSION_COOKIE = "drives_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const textEncoder = new TextEncoder();

type SignedSessionPayload = {
  role: AdminRole;
  email: string;
  exp: number;
};

function _encodePayload(payload: SignedSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function _decodePayload(encoded: string): SignedSessionPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SignedSessionPayload;
    if (
      !parsed ||
      typeof parsed.email !== "string" ||
      typeof parsed.exp !== "number" ||
      !isAdminRole(parsed.role)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function _importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function _sign(encodedPayload: string, secret: string): Promise<string> {
  const key = await _importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(encodedPayload));
  return Buffer.from(signature).toString("base64url");
}

function _safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Создаёт подписанное значение cookie сессии админ-панели.
 */
export async function createAdminSessionToken(
  user: AdminSessionUser,
  sessionSecret: string
): Promise<string> {
  const payload: SignedSessionPayload = {
    role: user.role,
    email: user.email,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = _encodePayload(payload);
  const signature = await _sign(encoded, sessionSecret);
  return `${encoded}.${signature}`;
}

/**
 * Разбирает и проверяет cookie сессии.
 */
export async function parseAdminSessionToken(
  token: string | undefined,
  sessionSecret: string
): Promise<AdminSessionUser | null> {
  if (!token) {
    return null;
  }

  const dot = token.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = await _sign(encoded, sessionSecret);
  if (!_safeEqual(signature, expected)) {
    return null;
  }

  const payload = _decodePayload(encoded);
  if (!payload || payload.exp < Date.now()) {
    return null;
  }

  return { role: payload.role, email: payload.email };
}

/**
 * Читает сессию из HTTP-запроса.
 */
export async function getAdminSessionFromRequest(
  req: NextRequest,
  sessionSecret: string
): Promise<AdminSessionUser | null> {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return parseAdminSessionToken(token, sessionSecret);
}

/**
 * Устанавливает cookie сессии в ответ.
 */
export async function setAdminSessionCookie(
  res: NextResponse,
  user: AdminSessionUser,
  sessionSecret: string
): Promise<void> {
  const token = await createAdminSessionToken(user, sessionSecret);
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/**
 * Сбрасывает cookie сессии.
 */
export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Проверяет, что роль имеет полный доступ администратора.
 */
export function isFullAdmin(user: AdminSessionUser): boolean {
  return user.role === ADMIN_ROLE_ADMIN;
}

/**
 * Проверяет, что пользователь — администратор или HrD.
 */
export function isPanelUser(user: AdminSessionUser): boolean {
  return user.role === ADMIN_ROLE_ADMIN || user.role === ADMIN_ROLE_HRD;
}
