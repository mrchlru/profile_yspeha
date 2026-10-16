import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type { EmployeeDocumentSlotId } from "@/lib/admin/employeeFolderTypes";
import {
  regenerateBurnoutReportInFolder,
  regenerateFolderDocumentReport,
  regenerateProfSbEducationReportInFolder,
  regenerateSpecialistScreeningReportInFolder,
  type RegenerateFolderDocumentReportResult,
} from "@/lib/admin/regenerateFolderDocumentReport";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FOLDER_DOCUMENT_IDS = [
  "resume",
  "short_report",
  "full_report",
  "manager_report",
  "executive_manager_report",
  "violations_report",
  "commission_reports",
  "dashboard",
  "attestation_report",
] as const;

const bodySchema = z
  .object({
    folderKey: z.string().min(1).max(300),
    sessionId: z.string().min(1).max(120),
    regenerateAi: z.boolean().optional(),
    kind: z.enum([
      "folder_document",
      "attestation",
      "burnout",
      "prof_sb_education",
      "specialist_screening",
    ]),
    documentId: z.enum(FOLDER_DOCUMENT_IDS).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "folder_document" && value.documentId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "documentId обязателен для folder_document",
        path: ["documentId"],
      });
    }
  });

type RegenerateResponse = RegenerateFolderDocumentReportResult | { error: string };

/**
 * Повторная генерация одного отчёта (HTML/PDF/дашборд или отдельные методики).
 */
export async function POST(req: NextRequest): Promise<NextResponse<RegenerateResponse>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let parsedBody: z.infer<typeof bodySchema>;
  try {
    const jsonBody = await req.json();
    const parsed = bodySchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }
    parsedBody = parsed.data;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const { folderKey, sessionId, kind } = parsedBody;
  const regenerateAi = parsedBody.regenerateAi !== false;
  const started = Date.now();

  screeningServerLog("admin_report_regenerate", "started", {
    kind,
    documentId: parsedBody.documentId ?? null,
    sessionId,
  });

  try {
    let result: RegenerateFolderDocumentReportResult;

    switch (kind) {
      case "folder_document":
        result = await regenerateFolderDocumentReport({
          folderKey,
          documentId: parsedBody.documentId as EmployeeDocumentSlotId,
          sessionId,
          regenerateAi,
        });
        break;
      case "attestation":
        result = await regenerateFolderDocumentReport({
          folderKey,
          documentId: "attestation_report",
          sessionId,
          regenerateAi,
        });
        break;
      case "burnout":
        result = await regenerateBurnoutReportInFolder(folderKey, sessionId);
        break;
      case "prof_sb_education":
        result = await regenerateProfSbEducationReportInFolder(folderKey, sessionId);
        break;
      case "specialist_screening":
        result = await regenerateSpecialistScreeningReportInFolder(folderKey, sessionId);
        break;
      default:
        result = { ok: false, message: "Неизвестный тип отчёта" };
    }

    screeningServerLog("admin_report_regenerate", result.ok ? "ok" : "failed", {
      kind,
      durationMs: Date.now() - started,
      message: result.message,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (err) {
    screeningServerLog("admin_report_regenerate", "error", {
      kind,
      durationMs: Date.now() - started,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json({ error: "Не удалось перегенерировать отчёт" }, { status: 500 });
  }
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
