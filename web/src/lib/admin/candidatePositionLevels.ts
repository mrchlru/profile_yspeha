import { STEP4_POSITION_LEVEL_OPTIONS } from "@/lib/step4/step4Labels";

export const CANDIDATE_POSITION_LEVEL_OPTIONS = STEP4_POSITION_LEVEL_OPTIONS;

const POSITION_LEVEL_VALUES = new Set(
  CANDIDATE_POSITION_LEVEL_OPTIONS.map((option) => option.value)
);

/**
 * Проверяет, что значение уровня должности допустимо для приглашения.
 */
export function isCandidatePositionLevel(value: string): boolean {
  return POSITION_LEVEL_VALUES.has(value);
}

/**
 * Возвращает подпись уровня должности по значению.
 */
export function candidatePositionLevelLabel(value: string): string {
  return (
    CANDIDATE_POSITION_LEVEL_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}
