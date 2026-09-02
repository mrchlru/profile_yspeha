import { prisma } from "@/lib/prisma";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import type { TestKind } from "@/lib/access/testKinds";
import { isTestKind } from "@/lib/access/testKinds";

export type AccessInviteCheckResult =
  | {
      status: "ok";
      code: string;
      testKind: TestKind;
      devMode: boolean;
      candidateFirstName: string | null;
      candidateLastName: string | null;
    }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "revoked" }
  | { status: "used" };

export type AccessInviteOkDetails = {
  code: string;
  testKind: TestKind;
  devMode: boolean;
  candidateFirstName: string | null;
  candidateLastName: string | null;
};

export async function checkAccessInvite(
  rawCode: string
): Promise<AccessInviteCheckResult> {
  const code = normalizeAccessCode(rawCode);
  if (code.length < 8) {
    return { status: "not_found" };
  }

  const row = await prisma.accessInvite.findFirst({
    where: { code },
    select: {
      code: true,
      testKind: true,
      devMode: true,
      candidateFirstName: true,
      candidateLastName: true,
      revokedAt: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!row) {
    return { status: "not_found" };
  }
  if (row.revokedAt !== null) {
    return { status: "revoked" };
  }
  if (row.usedAt !== null) {
    return { status: "used" };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return { status: "expired" };
  }
  if (!isTestKind(row.testKind)) {
    return { status: "not_found" };
  }

  return {
    status: "ok",
    code: row.code,
    testKind: row.testKind,
    devMode: row.devMode,
    candidateFirstName: row.candidateFirstName,
    candidateLastName: row.candidateLastName,
  };
}

/** Детали действующего приглашения (код, тип, DEV, ФИО из карточки). */
export async function loadActiveInviteDetails(
  rawCode: string
): Promise<AccessInviteOkDetails | null> {
  const result = await checkAccessInvite(rawCode);
  if (result.status !== "ok") {
    return null;
  }
  return {
    code: result.code,
    testKind: result.testKind,
    devMode: result.devMode,
    candidateFirstName: result.candidateFirstName,
    candidateLastName: result.candidateLastName,
  };
}

export async function findActiveInviteByCode(
  rawCode: string
): Promise<{ code: string; testKind: TestKind; devMode: boolean } | null> {
  const result = await checkAccessInvite(rawCode);
  if (result.status !== "ok") {
    return null;
  }
  return {
    code: result.code,
    testKind: result.testKind,
    devMode: result.devMode,
  };
}
