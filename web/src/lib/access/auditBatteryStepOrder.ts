import type { TestKind } from "@/lib/access/testKinds";
import { TEST_KIND_AUDIT_MIDDLE, TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { getAuditBatteryForTestKind } from "@/lib/audit/auditBatteries";
import { OD_RESERVE_SECTARIANISM_STEP_INDEX } from "@/lib/audit/odReserveSectarianism";

/**
 * Проверяет и нормализует порядок шагов батареи из БД для указанного типа приглашения.
 */
export function parseAuditBatteryStepOrder(
  raw: unknown,
  testKind: TestKind
): number[] | null {
  const battery = getAuditBatteryForTestKind(testKind);
  if (battery === null) {
    return null;
  }
  const allowedStepIndexes = new Set<number>(
    battery.blocks.flatMap((block) => [...block.stepIndexes])
  );
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const sequence: number[] = [];
  const seen = new Set<number>();
  for (const item of raw) {
    if (typeof item !== "number" || !Number.isInteger(item)) {
      return null;
    }
    if (!allowedStepIndexes.has(item)) {
      return null;
    }
    if (seen.has(item)) {
      return null;
    }
    seen.add(item);
    sequence.push(item);
  }
  if (seen.size === allowedStepIndexes.size) {
    return sequence;
  }
  if (_isLegacyOdReserveSequenceWithoutSectarianism(testKind, sequence, seen, allowedStepIndexes)) {
    return sequence;
  }
  const repaired = _repairLegacyScreeningSequenceWithoutSectarianism(
    testKind,
    sequence,
    seen,
    allowedStepIndexes
  );
  if (repaired !== null) {
    return repaired;
  }
  return null;
}

function _isLegacyOdReserveSequenceWithoutSectarianism(
  testKind: TestKind,
  sequence: number[],
  seen: Set<number>,
  allowedStepIndexes: Set<number>
): boolean {
  if (testKind !== TEST_KIND_AUDIT_MIDDLE) {
    return false;
  }
  const legacyAllowed = new Set(
    [...allowedStepIndexes].filter((step) => step !== OD_RESERVE_SECTARIANISM_STEP_INDEX)
  );
  if (sequence.length !== legacyAllowed.size || seen.size !== legacyAllowed.size) {
    return false;
  }
  for (const step of legacyAllowed) {
    if (!seen.has(step)) {
      return false;
    }
  }
  return true;
}

/**
 * Старые коды скрининга без шага 26: дописываем тест на сектантство в конец.
 */
function _repairLegacyScreeningSequenceWithoutSectarianism(
  testKind: TestKind,
  sequence: number[],
  seen: Set<number>,
  allowedStepIndexes: Set<number>
): number[] | null {
  if (testKind !== TEST_KIND_SCREENING) {
    return null;
  }
  if (seen.has(OD_RESERVE_SECTARIANISM_STEP_INDEX)) {
    return null;
  }
  const legacyAllowed = new Set(
    [...allowedStepIndexes].filter((step) => step !== OD_RESERVE_SECTARIANISM_STEP_INDEX)
  );
  if (sequence.length !== legacyAllowed.size || seen.size !== legacyAllowed.size) {
    return null;
  }
  for (const step of legacyAllowed) {
    if (!seen.has(step)) {
      return null;
    }
  }
  return [...sequence, OD_RESERVE_SECTARIANISM_STEP_INDEX];
}

/**
 * Типы приглашений с перемешанной батареей и сохранённым порядком шагов.
 */
export function testKindUsesAuditBatteryStepOrder(testKind: TestKind): boolean {
  return getAuditBatteryForTestKind(testKind) !== null;
}
