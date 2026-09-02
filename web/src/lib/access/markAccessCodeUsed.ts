import { prisma } from "@/lib/prisma";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import type { TestKind } from "@/lib/access/testKinds";

/**
 * Помечает код доступа как использованный. После этого код больше нельзя
 * применить для прохождения тестирования — `checkAccessInvite` начнёт
 * возвращать `status: "used"`.
 *
 * Использует условный `updateMany` (`code = …, test_kind = …, used_at IS NULL,
 * revoked_at IS NULL`), чтобы:
 *   - не «расходовать» код, отвязанный администратором (`revokedAt`);
 *   - не сбросить уже зафиксированную дату использования (идемпотентность).
 * Возвращает `true`, если строка действительно обновилась.
 */
export async function markAccessCodeUsed(
  rawCode: string,
  testKind: TestKind
): Promise<boolean> {
  const code = normalizeAccessCode(rawCode);
  if (code.length < 8) {
    return false;
  }
  const result = await prisma.accessInvite.updateMany({
    where: {
      code,
      testKind,
      usedAt: null,
      revokedAt: null,
    },
    data: { usedAt: new Date() },
  });
  return result.count > 0;
}
