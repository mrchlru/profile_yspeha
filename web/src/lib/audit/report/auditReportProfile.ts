import type { TestKind } from "@/lib/access/testKinds";
import {
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_SCREENING,
  TEST_KIND_STATE_AUDIT,
  TEST_KIND_STATE_AUDIT_DEV,
} from "@/lib/access/testKinds";
import { AUDIT_TEST_BLOCK_SPECS } from "@/lib/audit/report/auditTestBlockMeta";
import { CANDIDATE_SCREENING_TEST_BLOCK_SPECS } from "@/lib/audit/report/candidateScreeningTestBlockMeta";
import { OD_RESERVE_TEST_BLOCK_SPECS } from "@/lib/audit/report/odReserveTestBlockMeta";
import { TU_MANAGEMENT_CHEF_TEST_BLOCK_SPECS } from "@/lib/audit/report/tuManagementChefTestBlockMeta";
import type { AuditTestBlockSpec } from "@/lib/audit/report/auditTestBlockMeta";

/** Профиль отчёта: полный аудит, батареи ОД, ТУ или скрининга кандидата. */
export type AuditReportProfile =
  | "full_state_audit"
  | "od_reserve"
  | "tu_management_chef"
  | "candidate_screening";

/**
 * Возвращает профиль отчёта по типу приглашения.
 */
export function resolveAuditReportProfile(testKind: TestKind | null | undefined): AuditReportProfile {
  if (testKind === TEST_KIND_AUDIT_MIDDLE) {
    return "od_reserve";
  }
  if (testKind === TEST_KIND_AUDIT_SENIOR) {
    return "tu_management_chef";
  }
  if (testKind === TEST_KIND_SCREENING) {
    return "candidate_screening";
  }
  return "full_state_audit";
}

/** Спецификации блоков отчёта для выбранного профиля (фиксированный порядок). */
export function getAuditTestBlockSpecsForProfile(
  profile: AuditReportProfile
): ReadonlyArray<AuditTestBlockSpec> {
  if (profile === "od_reserve") {
    return OD_RESERVE_TEST_BLOCK_SPECS;
  }
  if (profile === "tu_management_chef") {
    return TU_MANAGEMENT_CHEF_TEST_BLOCK_SPECS;
  }
  if (profile === "candidate_screening") {
    return CANDIDATE_SCREENING_TEST_BLOCK_SPECS;
  }
  return AUDIT_TEST_BLOCK_SPECS;
}

/** Типы приглашений с полным маршрутом 24 шагов аудита состояния. */
export function isFullStateAuditTestKind(testKind: TestKind | null | undefined): boolean {
  return (
    testKind === TEST_KIND_STATE_AUDIT ||
    testKind === TEST_KIND_STATE_AUDIT_DEV ||
    testKind === undefined ||
    testKind === null
  );
}

