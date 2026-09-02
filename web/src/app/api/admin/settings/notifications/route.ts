import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getPiExhaustionNotificationSettings,
  PiExhaustionNotificationSettingsValidationError,
  updatePiExhaustionNotificationSettings,
} from "@/lib/admin/piExhaustionNotificationSettings";
import { requireFullAdminSession } from "@/lib/admin/requireAdminApi";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";

export const dynamic = "force-dynamic";

const putBodySchema = z
  .object({
    notifyAdmin: z.boolean(),
    notifyHrd: z.boolean(),
    notifyExtraEmailsRaw: z.string().max(4000),
  })
  .strict();

export async function GET(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        notifyAdmin: boolean;
        notifyHrd: boolean;
        notifyExtraEmailsRaw: string;
        updatedAt: string | null;
      }
    | { error: string }
  >
> {
  const auth = await requireFullAdminSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const settings = await getPiExhaustionNotificationSettings();
  return NextResponse.json(settings);
}

export async function PUT(
  req: NextRequest
): Promise<
  NextResponse<
    | {
        notifyAdmin: boolean;
        notifyHrd: boolean;
        notifyExtraEmailsRaw: string;
        updatedAt: string | null;
      }
    | { error: string }
  >
> {
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
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  try {
    const settings = await updatePiExhaustionNotificationSettings(parsed.data);
    screeningServerLog("admin_settings_notifications", "saved", {
      notifyAdmin: settings.notifyAdmin,
      notifyHrd: settings.notifyHrd,
      extraEmailCount: settings.notifyExtraEmailsRaw
        .split("\n")
        .filter((line) => line.trim().length > 0).length,
    });
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof PiExhaustionNotificationSettingsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export function POST(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
