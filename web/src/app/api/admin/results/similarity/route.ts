import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { computeSimilarAnswerClusters } from "@/lib/admin/computeSimilarAnswerClusters";
import {
  computeFolderSubtestSimilarityAlerts,
  type SimilarityScopeFilter,
} from "@/lib/admin/computeSubtestSimilarityIndex";
import type {
  FolderSubtestSimilarityResult,
  SimilarityClustersResult,
} from "@/lib/admin/similarityClusterTypes";
import { requireAdminPanelSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const querySchema = z.object({
  type: z.enum(["all", "screening", "audit"]).default("all"),
  folderKey: z.string().min(1).max(300).optional(),
});

export async function GET(
  req: NextRequest
): Promise<NextResponse<SimilarityClustersResult | FolderSubtestSimilarityResult | { error: string }>> {
  const auth = await requireAdminPanelSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const typeParam = req.nextUrl.searchParams.get("type") ?? "all";
  const folderKey = req.nextUrl.searchParams.get("folderKey")?.trim() || undefined;
  const parsed = querySchema.safeParse({ type: typeParam, folderKey });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  try {
    if (parsed.data.folderKey) {
      const folderResult = await computeFolderSubtestSimilarityAlerts(
        parsed.data.folderKey,
        parsed.data.type as SimilarityScopeFilter
      );
      screeningServerLog("admin_similarity", "folder_ok", {
        folderKey: parsed.data.folderKey,
        alerts: folderResult.alerts.length,
      });
      return NextResponse.json(folderResult);
    }

    const result = await computeSimilarAnswerClusters(parsed.data.type as SimilarityScopeFilter);
    screeningServerLog("admin_similarity", "ok", {
      type: parsed.data.type,
      clusters: result.clusters.length,
      flaggedFolders: Object.keys(result.folderHints).length,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    screeningServerLog("admin_similarity", "failed", { message: message.slice(0, 300) });
    return NextResponse.json({ error: "Не удалось рассчитать схожесть ответов." }, { status: 500 });
  }
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
