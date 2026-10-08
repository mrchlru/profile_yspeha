import { normalizeAccessCode } from "@/lib/access/accessCode";
import type { TestKind } from "@/lib/access/testKinds";
import { prisma } from "@/lib/prisma";

export type UpsertProctorSessionInput = {
  sessionId: string;
  accessCode: string;
  candidateFolderKey: string | null;
  testKind: TestKind;
  avProctorDisabled: boolean;
};

/**
 * Создаёт или находит строку сессии прокторинга с флагом AV с приглашения.
 */
export async function upsertProctorSessionRow(
  input: UpsertProctorSessionInput
): Promise<{ id: string; avProctorDisabled: boolean }> {
  const code = normalizeAccessCode(input.accessCode);
  const row = await prisma.proctorSession.upsert({
    where: { sessionId: input.sessionId },
    create: {
      sessionId: input.sessionId,
      accessCode: code,
      candidateFolderKey: input.candidateFolderKey,
      testKind: input.testKind,
      avProctorDisabled: input.avProctorDisabled,
    },
    update: {
      candidateFolderKey: input.candidateFolderKey ?? undefined,
      avProctorDisabled: input.avProctorDisabled,
    },
    select: { id: true, avProctorDisabled: true },
  });
  return row;
}
