/** Публичные константы бренда (без Node `fs` — можно импортировать из client components). */

export const DEFAULT_REPORT_BRAND_HYPERLINK_URL = "https://www.bts-kognium.ru/";

/** Логотип BTS для PDF/DOCX и отчётов (wordmark на светлом фоне). */
export const REPORT_BRAND_LOGO_PUBLIC_PATH = "/branding/bts-logo-on-light-bg.png";

/** Логотип в шапке батарей тестов (`public/branding/report-logo.png`). */
export const TEST_BATTERY_BRAND_LOGO_PUBLIC_PATH = "/branding/report-logo.png";

export type ReportBrandLogoSurface = "light" | "dark";
