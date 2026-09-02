/**
 * Задания CFIT для шагов 10–17 аудита (8 субтестов по методике Кэттелла).
 *
 * Порядок и инструкции — [Psylab, стимульный материал CFIT](https://psylab.info/Культурно-свободный_тест_интеллекта/Стимульный_материал)
 * и PDF «Тест на интеллект» (прил. II — ключ).
 *
 * | Шаг | Часть | Субтест | Тип                         | Заданий | Время | Ассеты              |
 * |-----|-------|---------|-----------------------------|---------|-------|---------------------|
 * | 10  | I     | 1       | серия 3+5                   | 12      | 4 мин | sub01 (Word docx)   |
 * | 11  | I     | 2       | лишняя фигура               | 14      | 4 мин | sub02 (Word docx)   |
 * | 12  | I     | 3       | дополнить рисунок           | 12      | 4 мин | sub03 (Word docx)   |
 * | 13  | I     | 4       | расположение точки          | 8       | 3 мин | sub05 (Word docx)   |
 * | 14  | II    | 1       | серия 3+5                   | 12      | 3 мин | sub07 (Word docx)   |
 * | 15  | II    | 2       | лишняя фигура               | 14      | 3 мин | sub04 (Word docx)   |
 * | 16  | II    | 3       | дополнить рисунок           | 12      | 3 мин | sub08 (Word docx)   |
 * | 17  | II    | 4       | расположение точки          | 8       | 3 мин | sub06 (Word docx)   |
 */

/** Вариант ответа CFIT по методике: цифры 1–5 (как на бланке). */
export type AuditCfitChoiceDigit = "1" | "2" | "3" | "4" | "5";

export const AUDIT_CFIT_CHOICE_DIGITS: ReadonlyArray<AuditCfitChoiceDigit> = [
  "1",
  "2",
  "3",
  "4",
  "5",
];

/** Пути к рисункам вариантов `1`…`5` (необязательно все). */
export type AuditCfitChoiceSrcs = Readonly<
  Partial<Record<AuditCfitChoiceDigit, string>>
>;

/** Один пункт субтеста CFIT. */
export type AuditCfitItem = {
  /** Номер задания внутри субтеста (1-based). */
  readonly index: number;
  /**
   * Верхний рисунок (стимул/условие). У «лишней фигуры» и «дополнить рисунок»
   * (Psylab) — целая строка задания; варианты A–E подписаны на картинке.
   */
  readonly stimulusSrc: string | null;
  /** Картинки пяти вариантов A–E (если есть отдельные файлы). */
  readonly choiceSrcs: AuditCfitChoiceSrcs;
};

export type AuditCfitSubtestInternalKey =
  | "cfit_subtest_1"
  | "cfit_subtest_2"
  | "cfit_subtest_3"
  | "cfit_subtest_4"
  | "cfit_subtest_5"
  | "cfit_subtest_6"
  | "cfit_subtest_7"
  | "cfit_subtest_8";

const _ROOT = "/audit/cfit";

/** Нормализует сохранённый ответ: `1`–`5` или устаревшие `a`–`e`. */
export function normalizeAuditCfitChoice(raw: unknown): AuditCfitChoiceDigit | null {
  if (raw === "1" || raw === "2" || raw === "3" || raw === "4" || raw === "5") {
    return raw;
  }
  if (raw === "a") {
    return "1";
  }
  if (raw === "b") {
    return "2";
  }
  if (raw === "c") {
    return "3";
  }
  if (raw === "d") {
    return "4";
  }
  if (raw === "e") {
    return "5";
  }
  return null;
}

/**
 * Целая строка задания из Psylab (`item-01.png` / `item-01.jpg`): стимул и варианты
 * на одном рисунке, ответ — цифра 1–5 под картинкой.
 */
function _fullRowImageUrls(
  subDir: string,
  itemCount: number,
  ext: "png" | "jpg" = "png"
): readonly AuditCfitItem[] {
  const dir = `${_ROOT}/${subDir}`;
  return Array.from({ length: itemCount }, (_, i) => {
    const index = i + 1;
    const stem = `item-${String(index).padStart(2, "0")}`;
    return {
      index,
      stimulusSrc: `${dir}/${stem}.${ext}`,
      choiceSrcs: {},
    };
  });
}

/** Задания по субтестам; пути указывают на `public/audit/cfit`. */
export const AUDIT_CFIT_ITEMS_BY_SUBTEST: Readonly<
  Record<AuditCfitSubtestInternalKey, readonly AuditCfitItem[]>
> = {
  cfit_subtest_1: _fullRowImageUrls("sub01", 12, "jpg"),
  cfit_subtest_2: _fullRowImageUrls("sub02", 14, "jpg"),
  cfit_subtest_3: _fullRowImageUrls("sub03", 12, "jpg"),
  cfit_subtest_4: _fullRowImageUrls("sub05", 8, "jpg"),
  cfit_subtest_5: _fullRowImageUrls("sub07", 12, "jpg"),
  cfit_subtest_6: _fullRowImageUrls("sub04", 14, "jpg"),
  cfit_subtest_7: _fullRowImageUrls("sub08", 12, "jpg"),
  cfit_subtest_8: _fullRowImageUrls("sub06", 8, "jpg"),
};
