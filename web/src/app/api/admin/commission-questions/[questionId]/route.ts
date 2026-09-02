import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteCommissionQuestion,
  updateCommissionQuestion,
} from "@/lib/admin/commission/commissionQuestionStore";
import { isCommissionQuestionCategory } from "@/lib/admin/commission/commissionQuestionTypes";
import type { CommissionQuestionCategoryId } from "@/lib/admin/commission/commissionQuestionTypes";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

const patchBodySchema = z.object({
  text: z.string().min(8).max(2000).optional(),
  category: z.string().min(1).max(80).optional(),
  positionLevels: z.array(z.string().min(1).max(80)).max(20).optional(),
  specialties: z.array(z.string().min(1).max(80)).max(30).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});

type RouteContext = {
  params: Promise<{ questionId: string }>;
};

export async function PATCH(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ item: unknown } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { questionId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  if (parsed.data.category && !isCommissionQuestionCategory(parsed.data.category)) {
    return NextResponse.json({ error: "Некорректная категория" }, { status: 400 });
  }

  try {
    const item = await updateCommissionQuestion(questionId, {
      text: parsed.data.text,
      category: parsed.data.category as CommissionQuestionCategoryId | undefined,
      positionLevels: parsed.data.positionLevels,
      specialties: parsed.data.specialties,
      active: parsed.data.active,
      sortOrder: parsed.data.sortOrder,
    });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось обновить вопрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { questionId } = await context.params;

  try {
    await deleteCommissionQuestion(questionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось удалить вопрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
