import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { normalizeAdminEmail } from "@/lib/admin/adminAuthConfig";
import { hashPassword } from "@/lib/admin/passwordHash";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { prisma } from "@/lib/prisma";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const putBodySchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(8).max(500),
  })
  .strict();

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    | { configured: boolean; email: string | null; updatedAt: string | null }
    | { error: string }
  >
> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const account = await prisma.hrdAccount.findFirst({
    orderBy: { createdAt: "asc" },
    select: { email: true, updatedAt: true },
  });

  return NextResponse.json({
    configured: account !== null,
    email: account?.email ?? null,
    updatedAt: account?.updatedAt.toISOString() ?? null,
  });
}

export async function PUT(
  req: NextRequest
): Promise<NextResponse<{ email: string; updatedAt: string } | { error: string }>> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = putBodySchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Укажите корректную почту и пароль (не короче 8 символов)" },
      { status: 400 }
    );
  }

  const email = normalizeAdminEmail(parsed.data.email);
  const passwordHash = await hashPassword(parsed.data.password);
  const existing = await prisma.hrdAccount.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const row = existing
    ? await prisma.hrdAccount.update({
        where: { id: existing.id },
        data: { email, passwordHash },
        select: { email: true, updatedAt: true },
      })
    : await prisma.hrdAccount.create({
        data: { email, passwordHash },
        select: { email: true, updatedAt: true },
      });

  screeningServerLog("admin_settings_hrd", "saved", { configured: true });
  return NextResponse.json({
    email: row.email,
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
