import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createCommissionQuestion,
  createCommissionQuestionsBatch,
  listCommissionQuestions,
} from "@/lib/admin/commission/commissionQuestionStore";
import { isCommissionQuestionCategory } from "@/lib/admin/commission/commissionQuestionTypes";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";

const createBodySchema = z.object({
  text: z.string().min(8).max(2000),
  category: z.string().min(1).max(80),
  positionLevels: z.array(z.string().min(1).max(80)).max(20).default([]),
  specialties: z.array(z.string().min(1).max(80)).max(30).default([]),
  aiSuggested: z.boolean().optional(),
});

const batchBodySchema = z.object({
  items: z.array(createBodySchema).min(1).max(100),
});

export async function GET(
  req: NextRequest
): Promise<NextResponse<{ items: Awaited<ReturnType<typeof listCommissionQuestions>> } | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = req.nextUrl.searchParams;
  const items = await listCommissionQuestions({
    positionLevel: params.get("positionLevel")?.trim() || undefined,
    specialty: params.get("specialty")?.trim() || undefined,
    category: params.get("category")?.trim() || undefined,
    includeInactive: params.get("includeInactive") === "true",
  });

  return NextResponse.json({ items });
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<{ item?: unknown; items?: unknown[]; error?: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const batchParsed = batchBodySchema.safeParse(body);
  if (batchParsed.success) {
    try {
      const items = await createCommissionQuestionsBatch(
        batchParsed.data.items.map((item) => ({
          text: item.text,
          category: _requireCategory(item.category),
          positionLevels: item.positionLevels,
          specialties: item.specialties,
          aiSuggested: item.aiSuggested,
          createdBy: auth.user.email,
        }))
      );
      return NextResponse.json({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить вопросы";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const singleParsed = createBodySchema.safeParse(body);
  if (!singleParsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  try {
    const item = await createCommissionQuestion({
      text: singleParsed.data.text,
      category: _requireCategory(singleParsed.data.category),
      positionLevels: singleParsed.data.positionLevels,
      specialties: singleParsed.data.specialties,
      aiSuggested: singleParsed.data.aiSuggested,
      createdBy: auth.user.email,
    });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить вопрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function _requireCategory(value: string) {
  if (!isCommissionQuestionCategory(value)) {
    throw new Error("Некорректная категория вопроса.");
  }
  return value;
}
