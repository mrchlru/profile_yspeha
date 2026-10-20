/** Строка таблицы «Ключевые показатели» в кратком отчёте аттестации. */
export type AttestationBriefKeyIndicatorRow = {
  indicator: string;
  result: string;
  meaning: string;
};

/** Структурированный краткий отчёт для руководителя (шаблон docx). */
export type AttestationBriefReportJson = {
  version: 1;
  /** «Малыгина Татьяна · бухгалтер финансового отдела» — часть после · генерирует ИИ. */
  roleSubtitle: string;
  /** «для руководителя финансового отдела» и т.п. */
  managerAudienceLine: string;
  /** Пункты раздела «1. Главное». */
  mainPoints: ReadonlyArray<string>;
  keyIndicators: ReadonlyArray<AttestationBriefKeyIndicatorRow>;
  pros: ReadonlyArray<string>;
  cons: ReadonlyArray<string>;
  undergroundGames: ReadonlyArray<string>;
  emotionalState: ReadonlyArray<string>;
  managerTodo: ReadonlyArray<string>;
  conversationQuestions: ReadonlyArray<string>;
  generatedAt: string;
};

export function isAttestationBriefReportJson(value: unknown): value is AttestationBriefReportJson {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<AttestationBriefReportJson>;
  return (
    row.version === 1 &&
    typeof row.roleSubtitle === "string" &&
    Array.isArray(row.mainPoints) &&
    Array.isArray(row.keyIndicators)
  );
}
