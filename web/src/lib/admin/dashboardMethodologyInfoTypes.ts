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

export type DashboardMethodologyInfo = {
  title: string;
  paragraphs: ReadonlyArray<string>;
  sections?: ReadonlyArray<DashboardMethodologyInfoSection>;
};
