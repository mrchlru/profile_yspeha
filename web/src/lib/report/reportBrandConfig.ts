import { existsSync, readFileSync } from "fs";
import path from "path";

import { DEFAULT_REPORT_BRAND_HYPERLINK_URL } from "@/lib/report/reportBrandConstants";
import type { ReportBrandLogoSurface } from "@/lib/report/reportBrandConstants";

export type { ReportBrandLogoSurface } from "@/lib/report/reportBrandConstants";

const LOGO_DIR_SUFFIXES: string[][] = [
  ["public", "branding"],
  ["web", "public", "branding"],
  ["src", "assets", "branding"],
  ["web", "src", "assets", "branding"],
];

const DEFAULT_LOGO_ON_LIGHT_SURFACE = "bts-logo-on-light-bg.png";
const DEFAULT_LOGO_ON_DARK_SURFACE = "bts-logo-on-dark-bg.png";
const LEGACY_LOGO_FILE = "report-logo.png";

/**
 * Путь к файлу логотипа для заданного фона.
 * `light` — чёрный/тёмный логотип; `dark` — белый логотип.
 */
export function resolveReportBrandLogoPath(surface: ReportBrandLogoSurface): string | null {
  const envKey =
    surface === "light"
      ? process.env.REPORT_BRAND_LOGO_ON_LIGHT_BG_PATH?.trim()
      : process.env.REPORT_BRAND_LOGO_ON_DARK_BG_PATH?.trim();
  if (envKey) {
    const resolved = path.resolve(envKey);
    if (existsSync(resolved)) {
      return resolved;
    }
    return null;
  }

  const legacyEnv = process.env.REPORT_BRAND_LOGO_PATH?.trim();
  if (legacyEnv && surface === "light") {
    const resolved = path.resolve(legacyEnv);
    if (existsSync(resolved)) {
      return resolved;
    }
  }

  const fileName =
    surface === "light" ? DEFAULT_LOGO_ON_LIGHT_SURFACE : DEFAULT_LOGO_ON_DARK_SURFACE;
  for (const dir of _collectSearchDirs(LOGO_DIR_SUFFIXES)) {
    const full = path.join(dir, fileName);
    if (existsSync(full)) {
      return full;
    }
  }

  if (surface === "light") {
    for (const dir of _collectSearchDirs(LOGO_DIR_SUFFIXES)) {
      const full = path.join(dir, LEGACY_LOGO_FILE);
      if (existsSync(full)) {
        return full;
      }
    }
  }
  return null;
}

/** Байты логотипа для фона или null. */
export function readReportBrandLogoBytes(surface: ReportBrandLogoSurface): Buffer | null {
  const logoPath = resolveReportBrandLogoPath(surface);
  if (!logoPath) {
    return null;
  }
  return readFileSync(logoPath);
}

/**
 * URL гиперссылки на логотип.
 * `REPORT_BRAND_URL` → по умолчанию сайт BTS → `APP_URL` / Railway.
 */
export function resolveReportBrandHyperlinkUrl(): string | null {
  const raw =
    process.env.REPORT_BRAND_URL?.trim() ||
    DEFAULT_REPORT_BRAND_HYPERLINK_URL ||
    process.env.APP_URL?.trim() ||
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (!raw) {
    return null;
  }
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function _collectSearchDirs(suffixes: string[][]): string[] {
  const bases: string[] = [];
  let cur = process.cwd();
  for (let i = 0; i < 16; i += 1) {
    bases.push(cur);
    const parent = path.dirname(cur);
    if (parent === cur) {
      break;
    }
    cur = parent;
  }
  const out: string[] = [];
  for (const base of bases) {
    for (const suffix of suffixes) {
      out.push(path.resolve(path.join(base, ...suffix)));
    }
  }
  return [...new Set(out)];
}
