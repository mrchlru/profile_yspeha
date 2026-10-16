import type { DashboardMethodologyContentBlock } from "@/lib/support/faqTestReferenceData";

export type { DashboardMethodologyContentBlock };

/** Идентификатор справочного описания методики для дашборда. */
export type DashboardMethodologyInfoId =
  | "cfit"
  | "gerchikov"
  | "goal"
  | "paperwork"
  | "rowe"
  | "mono_multitask"
  | "risk"
  | "stress"
  | "adaptability"
  | "locus"
  | "thomas"
  | "kos"
  | "burnout"
  | "burnout_pi"
  | "sectarianism";

export type DashboardMethodologyInfoSection = {
  title: string;
  items: ReadonlyArray<string>;
};

export type DashboardMethodologyInfoTableRow = {
  propertyDescription: string;
  possibleValues: string;
};

export type DashboardMethodologyInfo = {
  title: string;
  paragraphs: ReadonlyArray<string>;
  /** Структурированный текст листа xlsx (карточка «i» на дашборде). */
  blocks?: ReadonlyArray<DashboardMethodologyContentBlock>;
  /** @deprecated Только для legacy; сводная таблица — в FAQ, не в «i». */
  tableRows?: ReadonlyArray<DashboardMethodologyInfoTableRow>;
  sections?: ReadonlyArray<DashboardMethodologyInfoSection>;
};
