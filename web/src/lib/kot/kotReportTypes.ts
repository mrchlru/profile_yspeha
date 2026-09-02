/**
 * Сохраняемый в БД результат автоподсчёта КОТ и заключения (LLM).
 */
export type KotReportJson = {
  version: 4;
  /** Число верных ответов (Ип). */
  rawScore: number;
  maxScore: number;
  kotIp: number;
  kotIpLevelLabel: string;
  kotIpNormNote: string;
  conclusionText: string | null;
  hiringRecommendations: string | null;
  conclusionGeneratedAt: string | null;
  /** Успешная отправка письма на адреса из REPORT_RECIPIENT_EMAILS. */
  emailSent: boolean;
  /** Вложение PDF сформировано и приложено к письму. */
  pdfAttached: boolean;
  /** @deprecated ранее Word; оставлено для старых записей в БД */
  docxAttached?: boolean;
};
