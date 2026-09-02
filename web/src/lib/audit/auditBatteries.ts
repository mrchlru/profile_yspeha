import {
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_SCREENING,
  type TestKind,
} from "@/lib/access/testKinds";
import type { AuditInternalKey } from "@/lib/audit/auditTypes";
import { BATTERY_PROF_SB_STEP_MARKER } from "@/lib/audit/batteryStepMarkers";
import { getAuditStepByIndex } from "@/lib/audit/auditSteps";
import { seededShuffle } from "@/lib/shuffle/seededShuffle";

/** Один блок батареи: одна или несколько последовательных методик (CFIT — 8 шагов). */
export type AuditBatteryBlock = {
  blockId: string;
  /** Порядок в отчёте (1..N), не меняется при перемешивании прохождения. */
  reportBlockIndex: number;
  title: string;
  stepIndexes: ReadonlyArray<number>;
  internalKeys: ReadonlyArray<AuditInternalKey>;
};

export type AuditBattery = {
  id: AuditBatteryId;
  blockCount: number;
  blocks: ReadonlyArray<AuditBatteryBlock>;
};

export type AuditBatteryId = "od_reserve" | "tu_management_chef" | "candidate_screening";

/** 12 базовых методик батареи ОД / ТУ (без теста на сектантство). */
const OD_RESERVE_METHODOLOGY_BLOCKS: ReadonlyArray<AuditBatteryBlock> = [
    {
      blockId: "cfit",
      reportBlockIndex: 1,
      title: "Кеттелл (CFIT)",
      stepIndexes: [10, 11, 12, 13, 14, 15, 16, 17],
      internalKeys: [
        "cfit_subtest_1",
        "cfit_subtest_2",
        "cfit_subtest_3",
        "cfit_subtest_4",
        "cfit_subtest_5",
        "cfit_subtest_6",
        "cfit_subtest_7",
        "cfit_subtest_8",
      ],
    },
    {
      blockId: "kos",
      reportBlockIndex: 2,
      title: "Коммуникативные и организаторские способности",
      stepIndexes: [23],
      internalKeys: ["kos_communicative_organizational"],
    },
    {
      blockId: "thomas_kilmann",
      reportBlockIndex: 3,
      title: "Поведение в конфликте",
      stepIndexes: [20],
      internalKeys: ["thomas_kilmann_conflict"],
    },
    {
      blockId: "gerchikov",
      reportBlockIndex: 4,
      title: "Тип мотивации (Герчиков)",
      stepIndexes: [21],
      internalKeys: ["gerchikov_motivation_full"],
    },
    {
      blockId: "rukavishnikov_burnout",
      reportBlockIndex: 5,
      title: "Оценка выгорания",
      stepIndexes: [19],
      internalKeys: ["maslach_burnout"],
    },
    {
      blockId: "rowe",
      reportBlockIndex: 6,
      title: "ОСПДО",
      stepIndexes: [1],
      internalKeys: ["rowe_decision_styles"],
    },
    {
      blockId: "goal_pursuit",
      reportBlockIndex: 7,
      title: "Целеустремлённость",
      stepIndexes: [2],
      internalKeys: ["goal_pursuit_short"],
    },
    {
      blockId: "schubert_risk",
      reportBlockIndex: 8,
      title: "Готовность к риску",
      stepIndexes: [5],
      internalKeys: ["schubert_risk_full"],
    },
    {
      blockId: "type_a",
      reportBlockIndex: 9,
      title: "Стрессоустойчивость",
      stepIndexes: [6],
      internalKeys: ["type_a_jenkins_short"],
    },
    {
      blockId: "strelyau",
      reportBlockIndex: 10,
      title: "Адаптивность",
      stepIndexes: [7],
      internalKeys: ["strelyau_temperament_short"],
    },
    {
      blockId: "rotter",
      reportBlockIndex: 11,
      title: "Локус контроля",
      stepIndexes: [8],
      internalKeys: ["rotter_locus"],
    },
    {
      blockId: "maslach_mbi",
      reportBlockIndex: 12,
      title: "Тест на выгорание (Маслач)",
      stepIndexes: [25],
      internalKeys: ["maslach_mbi_short"],
    },
];

const OD_RESERVE_SECTARIANISM_BLOCK: AuditBatteryBlock = {
  blockId: "sectarianism",
  reportBlockIndex: 13,
  title: "Тест на выявление сектантства",
  stepIndexes: [26],
  internalKeys: ["sectarianism_screening"],
};

/** 13 методик для ОД и кадрового резерва (12 базовых + тест на сектантство). */
export const OD_RESERVE_BATTERY: AuditBattery = {
  id: "od_reserve",
  blockCount: 13,
  blocks: [...OD_RESERVE_METHODOLOGY_BLOCKS, OD_RESERVE_SECTARIANISM_BLOCK],
};

/** 7 блоков для скрининга кандидата: анкета ПРОФ СБ + 5 методик + тест на сектантство. */
export const CANDIDATE_SCREENING_BATTERY: AuditBattery = {
  id: "candidate_screening",
  blockCount: 6,
  blocks: [
    {
      blockId: "prof_sb",
      reportBlockIndex: 0,
      title: "Анкета ПРОФ СБ",
      stepIndexes: [BATTERY_PROF_SB_STEP_MARKER],
      internalKeys: [],
    },
    {
      blockId: "cfit",
      reportBlockIndex: 1,
      title: "Кеттелл (CFIT)",
      stepIndexes: [10, 11, 12, 13, 14, 15, 16, 17],
      internalKeys: [
        "cfit_subtest_1",
        "cfit_subtest_2",
        "cfit_subtest_3",
        "cfit_subtest_4",
        "cfit_subtest_5",
        "cfit_subtest_6",
        "cfit_subtest_7",
        "cfit_subtest_8",
      ],
    },
    {
      blockId: "thomas_kilmann",
      reportBlockIndex: 2,
      title: "Поведение в конфликте",
      stepIndexes: [20],
      internalKeys: ["thomas_kilmann_conflict"],
    },
    {
      blockId: "gerchikov",
      reportBlockIndex: 3,
      title: "Тип мотивации (Герчиков)",
      stepIndexes: [21],
      internalKeys: ["gerchikov_motivation_full"],
    },
    {
      blockId: "rukavishnikov_burnout",
      reportBlockIndex: 4,
      title: "Оценка выгорания",
      stepIndexes: [19],
      internalKeys: ["maslach_burnout"],
    },
    {
      blockId: "sectarianism",
      reportBlockIndex: 5,
      title: "Тест на выявление сектантства",
      stepIndexes: [26],
      internalKeys: ["sectarianism_screening"],
    },
  ],
};

/** 13 блоков для ТУ, упров и шефов: анкета ПРОФ СБ + 12 методик аудита (без секты). */
export const TU_MANAGEMENT_CHEF_BATTERY: AuditBattery = {
  id: "tu_management_chef",
  blockCount: 13,
  blocks: [
    {
      blockId: "prof_sb",
      reportBlockIndex: 0,
      title: "Анкета ПРОФ СБ",
      stepIndexes: [BATTERY_PROF_SB_STEP_MARKER],
      internalKeys: [],
    },
    ...OD_RESERVE_METHODOLOGY_BLOCKS,
  ],
};

/** Возвращает батарею по идентификатору. */
export function getAuditBatteryById(id: AuditBatteryId): AuditBattery | null {
  if (id === "od_reserve") {
    return OD_RESERVE_BATTERY;
  }
  if (id === "tu_management_chef") {
    return TU_MANAGEMENT_CHEF_BATTERY;
  }
  if (id === "candidate_screening") {
    return CANDIDATE_SCREENING_BATTERY;
  }
  return null;
}

/** Возвращает батарею для типа приглашения или `null` (полный маршрут 24 шага). */
export function getAuditBatteryForTestKind(testKind: TestKind | null | undefined): AuditBattery | null {
  if (testKind === TEST_KIND_AUDIT_MIDDLE) {
    return OD_RESERVE_BATTERY;
  }
  if (testKind === TEST_KIND_AUDIT_SENIOR) {
    return TU_MANAGEMENT_CHEF_BATTERY;
  }
  if (testKind === TEST_KIND_SCREENING) {
    return CANDIDATE_SCREENING_BATTERY;
  }
  return null;
}

/**
 * Строит плоский порядок шагов: блоки перемешаны по seed, внутри блока — по порядку.
 */
export function buildBatteryStepSequenceFromSeed(battery: AuditBattery, seed: string): number[] {
  const shuffledBlocks = seededShuffle(battery.blocks, seed);
  const sequence: number[] = [];
  for (const block of shuffledBlocks) {
    for (const stepIndex of block.stepIndexes) {
      sequence.push(stepIndex);
    }
  }
  return sequence;
}

/** Slug первого шага аудита по сохранённой последовательности (без маркера ПРОФ СБ). */
export function getBatteryFirstStepSlugFromSequence(stepSequence: ReadonlyArray<number>): string | null {
  const firstIndex = stepSequence[0];
  if (firstIndex === undefined) {
    return null;
  }
  if (firstIndex === BATTERY_PROF_SB_STEP_MARKER) {
    return null;
  }
  return getAuditStepByIndex(firstIndex)?.slug ?? null;
}

/** Следующий шаг в батарее или `null`, если текущий — последний. */
export function getNextBatteryStepIndexFromSequence(
  stepSequence: ReadonlyArray<number>,
  currentStepIndex: number
): number | null {
  const position = stepSequence.indexOf(currentStepIndex);
  if (position < 0) {
    return null;
  }
  return stepSequence[position + 1] ?? null;
}

/** Номер блока (1..blockCount) для отчётов и legacy UI. */
export function getBatteryBlockProgressFromSequence(
  battery: AuditBattery,
  stepSequence: ReadonlyArray<number>,
  stepIndex: number
): { blockNumber: number; blockCount: number } {
  const blockIdByStep = _buildStepToBlockIdMap(battery);
  const seenBlockIds = new Set<string>();
  let blockNumber = 0;
  for (const sequenceStep of stepSequence) {
    const blockId = blockIdByStep.get(sequenceStep);
    if (blockId === undefined) {
      continue;
    }
    if (!seenBlockIds.has(blockId)) {
      seenBlockIds.add(blockId);
      blockNumber += 1;
    }
    if (sequenceStep === stepIndex) {
      return { blockNumber, blockCount: battery.blockCount };
    }
  }
  return { blockNumber: 1, blockCount: battery.blockCount };
}

/** Позиция шага в последовательности (0-based) или -1. */
export function getBatteryStepSequencePositionFromSequence(
  stepSequence: ReadonlyArray<number>,
  stepIndex: number
): number {
  return stepSequence.indexOf(stepIndex);
}

/**
 * Прогресс «Шаг N из M» по сохранённой последовательности батареи.
 * Каждый субтест CFIT — отдельный шаг; маркер анкеты ПРОФ СБ (0) — тоже шаг.
 */
export function getBatterySequenceStepProgress(
  stepSequence: ReadonlyArray<number>,
  stepIndex: number
): { stepNumber: number; totalSteps: number } {
  const totalSteps = stepSequence.length;
  if (totalSteps === 0) {
    return { stepNumber: 1, totalSteps: 1 };
  }
  const position = stepSequence.indexOf(stepIndex);
  if (position < 0) {
    return { stepNumber: 1, totalSteps };
  }
  return { stepNumber: position + 1, totalSteps };
}

/** Число шагов в батарее (с учётом субтестов CFIT). */
export function getBatteryTotalStepCount(battery: AuditBattery): number {
  return battery.blocks.reduce((sum, block) => sum + block.stepIndexes.length, 0);
}

function _buildStepToBlockIdMap(battery: AuditBattery): Map<number, string> {
  const map = new Map<number, string>();
  for (const block of battery.blocks) {
    for (const stepIndex of block.stepIndexes) {
      map.set(stepIndex, block.blockId);
    }
  }
  return map;
}
