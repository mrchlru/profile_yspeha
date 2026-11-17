import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Лёгкий ping для проверки доступности API с клиента.
 */
export function GET(): NextResponse<{ ok: true; ts: string }> {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}