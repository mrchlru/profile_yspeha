import {
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_BURNOUT,
  TEST_KIND_SCREENING,
  type TestKind,
} from "@/lib/access/testKinds";

export type GoogleSheetsLeafColumn = {
  id: string;
  titleRow2: string;
  widthPx: number;
};

export type GoogleSheetsColumnGroup = {
  titleRow1: string;
  columns: ReadonlyArray<GoogleSheetsLeafColumn>;
};

export type GoogleSheetsColumnDef =
  | ({ kind: "single" } & GoogleSheetsLeafColumn & { titleRow1: string })
  | ({ kind: "group" } & GoogleSheetsColumnGroup);

export type GoogleSheetsSheetSchema = {
  sheetTitle: string;
  columns: ReadonlyArray<GoogleSheetsColumnDef>;
};

const BASE_COLUMNS: ReadonlyArray<GoogleSheetsColumnDef> = [
  { kind: "single", id: "seq", titleRow1: "№", titleRow2: "", widthPx: 48 },
  { kind: "single", id: "fullName", titleRow1: "ФИО", titleRow2: "", widthPx: 220 },
  { kind: "single", id: "birthDate", titleRow1: "Дата рождения", titleRow2: "", widthPx: 120 },
  {
    kind: "single",
    id: "submittedAt",
    titleRow1: "Дата прохождения теста",
    titleRow2: "",
    widthPx: 160,
  },
];

const SECTARIANISM_GROUP: GoogleSheetsColumnGroup = {
  titleRow1: "Тест на выявление сектантской вовлечённости",
  columns: [
    { id: "sect_jehovah_witnesses", titleRow2: "Свидетели Иеговы", widthPx: 130 },
    { id: "sect_herbalife", titleRow2: "Гербалайф", widthPx: 110 },
    { id: "sect_scientology", titleRow2: "Саентология", widthPx: 110 },
    { id: "sect_deir", titleRow2: "ДЭИР", widthPx: 88 },
    { id: "sect_hizb_ut_tahrir_wahhabism", titleRow2: "Хизб Ут-Тахрир", widthPx: 120 },
    { id: "sect_new_acropolis", titleRow2: "Новый Акрополь", widthPx: 130 },
  ],
};

const RUKAVISHNIKOV_GROUP: GoogleSheetsColumnGroup = {
  titleRow1: "Оценка профессионального выгорания",
  columns: [
    { id: "ruk_pm", titleRow2: "ПМ", widthPx: 72 },
    { id: "ruk_pi", titleRow2: "ПИ", widthPx: 72 },
    { id: "ruk_lo", titleRow2: "ЛО", widthPx: 72 },
    { id: "ruk_ipv", titleRow2: "ИПВ", widthPx: 72 },
    { id: "ruk_izr", titleRow2: "ИЗР", widthPx: 72 },
  ],
};

const MASLACH_GROUP: GoogleSheetsColumnGroup = {
  titleRow1: "Оценка выгорания (Маслач)",
  columns: [
    { id: "mas_ee", titleRow2: "ЭИ", widthPx: 72 },
    { id: "mas_dp", titleRow2: "ДП", widthPx: 72 },
    { id: "mas_pa", titleRow2: "РПД", widthPx: 72 },
  ],
};

const MANAGEMENT_BATTERY_COLUMNS: ReadonlyArray<GoogleSheetsColumnDef> = [
  { kind: "single", id: "iq", titleRow1: "Тест IQ", titleRow2: "", widthPx: 88 },
  {
    kind: "single",
    id: "kos",
    titleRow1: "Оценка коммуникативных и организаторских способностей",
    titleRow2: "",
    widthPx: 200,
  },
  {
    kind: "single",
    id: "thomas",
    titleRow1: "Оценка поведения в конфликте",
    titleRow2: "",
    widthPx: 180,
  },
  {
    kind: "single",
    id: "gerchikov",
    titleRow1: "Тип трудовой мотивации",
    titleRow2: "",
    widthPx: 160,
  },
  { kind: "group", ...RUKAVISHNIKOV_GROUP },
  {
    kind: "single",
    id: "rowe",
    titleRow1: "Ориентационный стиль профессионально-деятельностного общения",
    titleRow2: "",
    widthPx: 220,
  },
  {
    kind: "single",
    id: "goal",
    titleRow1: "Оценка целеустремлённости",
    titleRow2: "",
    widthPx: 120,
  },
  {
    kind: "single",
    id: "schubert",
    titleRow1: "Оценка готовности к риску",
    titleRow2: "",
    widthPx: 120,
  },
  {
    kind: "single",
    id: "type_a",
    titleRow1: "Оценка стрессоустойчивости",
    titleRow2: "",
    widthPx: 120,
  },
  {
    kind: "single",
    id: "strelyau",
    titleRow1: "Оценка адаптивности",
    titleRow2: "",
    widthPx: 120,
  },
  {
    kind: "single",
    id: "rotter",
    titleRow1: "Внешний и внутренний локус контроля",
    titleRow2: "",
    widthPx: 160,
  },
  { kind: "group", ...MASLACH_GROUP },
];

export const GOOGLE_SHEETS_SCHEMA_SCREENING: GoogleSheetsSheetSchema = {
  sheetTitle: "Скрининг",
  columns: [
    ...BASE_COLUMNS,
    { kind: "single", id: "iq", titleRow1: "Тест IQ", titleRow2: "", widthPx: 88 },
    {
      kind: "single",
      id: "thomas",
      titleRow1: "Оценка поведения в конфликте",
      titleRow2: "",
      widthPx: 180,
    },
    {
      kind: "single",
      id: "gerchikov",
      titleRow1: "Тип трудовой мотивации",
      titleRow2: "",
      widthPx: 160,
    },
    { kind: "group", ...RUKAVISHNIKOV_GROUP },
    { kind: "group", ...SECTARIANISM_GROUP },
  ],
};

/** Лист «Среднее звено» — тип приглашения «ТУ, упров и шефы». */
export const GOOGLE_SHEETS_SCHEMA_SENIOR: GoogleSheetsSheetSchema = {
  sheetTitle: "Среднее звено",
  columns: [...BASE_COLUMNS, ...MANAGEMENT_BATTERY_COLUMNS],
};

/** Лист «Для руководителей» — тип приглашения «ОД, руководители, кадровый резерв». */
export const GOOGLE_SHEETS_SCHEMA_MIDDLE: GoogleSheetsSheetSchema = {
  sheetTitle: "Для руководителей",
  columns: [...BASE_COLUMNS, ...MANAGEMENT_BATTERY_COLUMNS, { kind: "group", ...SECTARIANISM_GROUP }],
};

export const GOOGLE_SHEETS_SCHEMA_BURNOUT: GoogleSheetsSheetSchema = {
  sheetTitle: "Выгорание",
  columns: [...BASE_COLUMNS, { kind: "group", ...MASLACH_GROUP }],
};

/** Возвращает схему листа для типа приглашения или `null` (выгрузка не нужна). */
export function googleSheetsSchemaForTestKind(testKind: TestKind): GoogleSheetsSheetSchema | null {
  switch (testKind) {
    case TEST_KIND_SCREENING:
      return GOOGLE_SHEETS_SCHEMA_SCREENING;
    case TEST_KIND_AUDIT_SENIOR:
      return GOOGLE_SHEETS_SCHEMA_SENIOR;
    case TEST_KIND_AUDIT_MIDDLE:
      return GOOGLE_SHEETS_SCHEMA_MIDDLE;
    case TEST_KIND_BURNOUT:
      return GOOGLE_SHEETS_SCHEMA_BURNOUT;
    default:
      return null;
  }
}

/** Разворачивает схему в плоский список id колонок (порядок ячеек строки). */
export function flattenGoogleSheetsColumnIds(
  schema: GoogleSheetsSheetSchema
): ReadonlyArray<string> {
  const ids: string[] = [];
  for (const column of schema.columns) {
    if (column.kind === "single") {
      ids.push(column.id);
      continue;
    }
    for (const leaf of column.columns) {
      ids.push(leaf.id);
    }
  }
  return ids;
}

/** Число колонок листа. */
export function googleSheetsColumnCount(schema: GoogleSheetsSheetSchema): number {
  return flattenGoogleSheetsColumnIds(schema).length;
}
