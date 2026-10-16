import type { DashboardMethodologyInfoId } from "@/lib/admin/dashboardMethodologyInfoTypes";
import {
  DASHBOARD_METHODOLOGY_CONTENT_BLOCKS,
  FAQ_DASHBOARD_METHODOLOGY_DETAIL_SHEET,
  FAQ_TEST_REFERENCE_DETAILS,
  FAQ_TEST_REFERENCE_TABLE,
  type DashboardMethodologyContentBlock,
  type FaqTestReferenceDetailSheet,
  type FaqTestReferenceTableRow,
} from "@/lib/support/faqTestReferenceData";

export type { DashboardMethodologyContentBlock };

export type { FaqTestReferenceDetailSheet, FaqTestReferenceTableRow };

/** Строки сводной таблицы «ТЕСТ» из справочника заказчика. */
export function getFaqTestReferenceTable(): ReadonlyArray<FaqTestReferenceTableRow> {
  return FAQ_TEST_REFERENCE_TABLE;
}

/** Подробные тексты по листам xlsx (кроме сводной таблицы). */
export function getFaqTestReferenceDetails(): ReadonlyArray<FaqTestReferenceDetailSheet> {
  return FAQ_TEST_REFERENCE_DETAILS;
}

/**
 * Полные абзацы методики для дашборда (лист xlsx, привязанный к infoId).
 */
export function getDashboardMethodologyDetailLines(
  infoId: DashboardMethodologyInfoId
): ReadonlyArray<string> | null {
  if (infoId === "sectarianism") {
    return null;
  }
  const sheetTitle = FAQ_DASHBOARD_METHODOLOGY_DETAIL_SHEET[infoId];
  if (!sheetTitle) {
    return null;
  }
  const sheet = FAQ_TEST_REFERENCE_DETAILS.find((item) => item.sheetTitle === sheetTitle);
  return sheet?.lines ?? null;
}

/** Блоки оформления листа xlsx для модалки «i» на дашборде. */
export function getDashboardMethodologyContentBlocks(
  infoId: DashboardMethodologyInfoId
): ReadonlyArray<DashboardMethodologyContentBlock> | null {
  if (infoId === "sectarianism") {
    return null;
  }
  const blocks = DASHBOARD_METHODOLOGY_CONTENT_BLOCKS[infoId];
  return blocks && blocks.length > 0 ? blocks : null;
}
