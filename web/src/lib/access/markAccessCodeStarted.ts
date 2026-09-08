import { prisma } from "@/lib/prisma";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import type { TestKind } from "@/lib/access/testKinds";

/**
 * Фиксирует первый вход по коду (статус «Начал проходить»).
 * Идемпотентно: не перезаписывает уже заданный startedAt.
 */
export async function markAccessCodeStarted(
  rawCode: string,
  testKind?: TestKind
): Promise<boolean> {
  const code = normalizeAccessCode(rawCode);
  if (code.length < 8) {
    return false;
  }
  const result = await prisma.accessInvite.updateMany({
    where: {
      code,
      ...(testKind ? { testKind } : {}),
      startedAt: null,
      usedAt: null,
      revokedAt: null,
    },
    data: { startedAt: new Date() },
  });
  return result.count > 0;
}
