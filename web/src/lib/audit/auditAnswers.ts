/**
 * Хранилище ответов аудита: универсальные структуры, поверх которых работают
 * UI-компоненты конкретных тестов. Конкретные «семантические» значения (например,
 * `"yes" | "no"` для теста 7) уточняются в типах конкретного шага.
 *
 * Используется как payload `useAuditFormStore`: каждый шаг — отдельная запись
 * `Record<questionId, value>`. Это позволяет добавлять тесты по одному без
 * перерасчёта структуры стора и без поломки persisted state.
 */

/** Значение одного ответа: string, число, массив строк (для multi-select) или `null` (не отвечено). */
export type AuditAnswerEntry = string | number | ReadonlyArray<string> | null;

/** Ответы по одному шагу: ключ — идентификатор вопроса (`"q1"`, `"q2"`, …). */
export type AuditStepAnswers = Record<string, AuditAnswerEntry>;

/** Все ответы по всем шагам: ключ — номер шага (1..AUDIT_TOTAL_STEPS). */
export type AuditAnswersMap = Record<number, AuditStepAnswers>;

/** Создаёт пустые ответы для шага с известным числом вопросов. */
export function createEmptyStepAnswers(questionCount: number): AuditStepAnswers {
  const result: AuditStepAnswers = {};
  for (let i = 1; i <= questionCount; i += 1) {
    result[`q${String(i)}`] = null;
  }
  return result;
}

/**
 * Возвращает число отвеченных вопросов в шаге.
 * Пропуски/тайм-аут можно сохранять пустой строкой — они тоже считаются «закрытым» слотом
 * (по аналогии с прогрессом КОТ из скрининга), так что шкала прогресса не зависнет.
 */
export function getStepAnsweredCount(answers: AuditStepAnswers | undefined): number {
  if (!answers) {
    return 0;
  }
  let n = 0;
  for (const key of Object.keys(answers)) {
    const value = answers[key];
    if (_isAnswered(value)) {
      n += 1;
    }
  }
  return n;
}

function _isAnswered(value: AuditAnswerEntry): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}
