import { normalizeAccessCode } from "@/lib/access/accessCode";

import { checkAccessInvite } from "@/lib/access/findActiveInvite";

import { isProctorTestKind, isTestKind, type TestKind } from "@/lib/access/testKinds";

import { prisma } from "@/lib/prisma";



export type ProctorAccessResult =

  | {

      ok: true;

      candidateFolderKey: string | null;

      testKind: TestKind;

    }

  | { ok: false; status: number; error: string };



/**

 * Проверяет, что код доступа относится к батарее с прокторингом.

 * Разрешает активный код и уже использованный (финальная отправка событий).

 */

export async function requireProctorAccess(

  sessionId: string,

  rawAccessCode: string

): Promise<ProctorAccessResult> {

  const code = normalizeAccessCode(rawAccessCode);

  if (code.length < 8) {

    return { ok: false, status: 403, error: "Недействительный код доступа" };

  }



  const inviteRow = await prisma.accessInvite.findFirst({

    where: { code },

    select: {

      testKind: true,

      candidateFolderKey: true,

      revokedAt: true,

      expiresAt: true,

      usedAt: true,

    },

  });



  if (inviteRow === null || inviteRow.revokedAt !== null) {

    return { ok: false, status: 403, error: "Недействительный код доступа" };

  }



  if (inviteRow.usedAt === null) {

    const invite = await checkAccessInvite(rawAccessCode);

    if (invite.status !== "ok") {

      return { ok: false, status: 403, error: "Недействительный код доступа" };

    }

  } else if (inviteRow.expiresAt.getTime() <= Date.now()) {

    return { ok: false, status: 403, error: "Недействительный код доступа" };

  }



  if (!isTestKind(inviteRow.testKind) || !isProctorTestKind(inviteRow.testKind)) {

    return { ok: false, status: 403, error: "Прокторинг недоступен для этого типа теста" };

  }



  const existing = await prisma.proctorSession.findUnique({

    where: { sessionId },

    select: { accessCode: true },

  });

  if (existing !== null && normalizeAccessCode(existing.accessCode) !== code) {

    return { ok: false, status: 403, error: "Сессия не соответствует коду доступа" };

  }



  return {

    ok: true,

    candidateFolderKey: inviteRow.candidateFolderKey ?? null,

    testKind: inviteRow.testKind,

  };

}

