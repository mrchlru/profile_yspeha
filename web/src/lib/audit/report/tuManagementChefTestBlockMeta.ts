import type { AuditInternalKey } from "@/lib/audit/auditTypes";
import type { AuditTestBlockSpec } from "@/lib/audit/report/auditTestBlockMeta";
import { OD_RESERVE_TEST_BLOCK_SPECS } from "@/lib/audit/report/odReserveTestBlockMeta";
import { BATTERY_PROF_SB_STEP_MARKER } from "@/lib/audit/batteryStepMarkers";

const EMPTY_INTERNAL_KEYS: ReadonlyArray<AuditInternalKey> = [];

/**
 * Фиксированный порядок блоков отчёта для батареи ТУ, упров и шефов.
 * Блок 0 — анкета ПРОФ СБ; блоки 1–12 — те же методики, что у ОД / резерва.
 */
export const TU_MANAGEMENT_CHEF_TEST_BLOCK_SPECS: ReadonlyArray<AuditTestBlockSpec> = [
  {
    blockIndex: 0,
    title: "Анкета ПРОФ СБ",
    methodology:
      "Расширенная анкета кандидата (step-4 скрининга): личные данные, образование, опыт, спецопыт",
    stepIndexes: [BATTERY_PROF_SB_STEP_MARKER],
    internalKeys: EMPTY_INTERNAL_KEYS,
  },
  ...OD_RESERVE_TEST_BLOCK_SPECS.map((spec) => ({
    ...spec,
    blockIndex: spec.blockIndex,
  })),
];
