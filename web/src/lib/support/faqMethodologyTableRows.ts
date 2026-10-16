import type { DashboardMethodologyInfoId } from "@/lib/admin/dashboardMethodologyInfoTypes";
import {
  FAQ_TEST_REFERENCE_TABLE,
  type FaqTestReferenceTableRow,
} from "@/lib/support/faqTestReferenceData";

const METHODOLOGY_TABLE_MATCHERS: Readonly<
  Record<Exclude<DashboardMethodologyInfoId, "sectarianism">, ReadonlyArray<string>>
> = {
  cfit: ["IQ Кеттелл", "IQ Кеттел"],
  gerchikov: ["ГЕРЧИКОВ"],
  goal: ["поставленных целей"],
  paperwork: ["документац"],
  rowe: ["Ориентационные стили"],
  mono_multitask: ["самоуправлению в общении"],
  adaptability: ["психологической адаптивности"],
  risk: ["готовности к риску"],
  stress: ["стрессоустойчивости"],
  locus: ["локус-контроля"],
  thomas: ["ТОМАС"],
  kos: ["ТЕСТ КОС"],
  burnout: ["РУКАВИШНИКОВ"],
  burnout_pi: ["РУКАВИШНИКОВ"],
};

/**
 * Строки сводной таблицы, относящиеся к методике дашборда.
 */
export function getFaqTableRowsForMethodology(
  infoId: DashboardMethodologyInfoId
): ReadonlyArray<FaqTestReferenceTableRow> {
  if (infoId === "sectarianism") {
    return [];
  }
  const needles = METHODOLOGY_TABLE_MATCHERS[infoId];
  let rows = FAQ_TEST_REFERENCE_TABLE.filter((row) =>
    needles.some((needle) => row.testName.toUpperCase().includes(needle.toUpperCase()))
  );
  if (infoId === "burnout_pi") {
    rows = rows.filter((row) => row.propertyDescription.includes("Психоэмоцион"));
  }
  return rows;
}
