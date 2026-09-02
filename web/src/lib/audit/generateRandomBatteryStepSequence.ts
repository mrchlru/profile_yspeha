import { randomUUID } from "node:crypto";

import type { AuditBattery } from "@/lib/audit/auditBatteries";
import { buildBatteryStepSequenceFromSeed } from "@/lib/audit/auditBatteries";

/**
 * Генерирует случайный порядок шагов при создании кода доступа (только сервер).
 */
export function generateRandomBatteryStepSequence(battery: AuditBattery): number[] {
  return buildBatteryStepSequenceFromSeed(battery, randomUUID());
}
