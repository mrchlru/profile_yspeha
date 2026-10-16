import { buildDashboardSectarianismInfo } from "@/lib/admin/buildDashboardSectarianismInfo";
import { getDashboardMethodologyContentBlocks } from "@/lib/support/faqTestReference";
export type {
  DashboardMethodologyInfo,
  DashboardMethodologyInfoId,
  DashboardMethodologyInfoSection,
} from "@/lib/admin/dashboardMethodologyInfoTypes";
import type {
  DashboardMethodologyInfo,
  DashboardMethodologyInfoId,
} from "@/lib/admin/dashboardMethodologyInfoTypes";

/** Заголовки модалок «i»; текст — из листов xlsx (блоки). */
const DASHBOARD_METHODOLOGY_TITLES: Readonly<
  Record<Exclude<DashboardMethodologyInfoId, "sectarianism">, string>
> = {
  cfit: "IQ (Кэттелл, CFIT)",
  gerchikov: "Мотивационный тип (Герчиков)",
  goal: "Целеустремлённость",
  paperwork: "Стиль работы с документами",
  rowe: "Направленность (ОСПДО, Роу)",
  mono_multitask: "Моно- и многозадачность в общении",
  adaptability: "Психологическая адаптивность (Стреляу)",
  risk: "Готовность к риску (Шуберт)",
  stress: "Стрессоустойчивость (тип А / тип Б)",
  locus: "Локус контроля (Роттер)",
  thomas: "Поведение в конфликте (Томас–Килманн)",
  kos: "КОС — коммуникативные и организаторские склонности",
  burnout: "Выгорание (Рукавишников)",
  burnout_pi: "Психоэмоциональное истощение (ПИ)",
};

/** Краткий fallback, если для методики нет листа в xlsx. */
const DASHBOARD_METHODOLOGY_FALLBACK_PARAGRAPHS: Readonly<
  Partial<Record<Exclude<DashboardMethodologyInfoId, "sectarianism">, ReadonlyArray<string>>>
> = {};

/**
 * Возвращает справочное описание методики для дашборда.
 */
export function getDashboardMethodologyInfo(
  id: DashboardMethodologyInfoId
): DashboardMethodologyInfo {
  if (id === "sectarianism") {
    return buildDashboardSectarianismInfo();
  }
  const title = DASHBOARD_METHODOLOGY_TITLES[id];
  const blocks = getDashboardMethodologyContentBlocks(id);
  if (blocks) {
    return { title, paragraphs: [], blocks };
  }
  return {
    title,
    paragraphs: DASHBOARD_METHODOLOGY_FALLBACK_PARAGRAPHS[id] ?? [
      "Подробное описание для этой методики пока не загружено из справочника.",
    ],
  };
}

/**
 * Сопоставляет ключ метрики или карточки теста на дашборде со справочником.
 */
export function dashboardMethodologyInfoIdFromKey(
  key: string
): DashboardMethodologyInfoId | null {
  const map: Readonly<Record<string, DashboardMethodologyInfoId>> = {
    cfit: "cfit",
    gerchikov: "gerchikov",
    motivation: "gerchikov",
    goal: "goal",
    purposefulness: "goal",
    paperwork: "paperwork",
    rowe: "rowe",
    snyder: "mono_multitask",
    selfmonitoring: "mono_multitask",
    schubert: "risk",
    risk: "risk",
    typea: "stress",
    stress: "stress",
    strelyau: "adaptability",
    adaptability: "adaptability",
    rotter: "locus",
    locus: "locus",
    thomas: "thomas",
    conflict: "thomas",
    kos: "kos",
    communication: "kos",
    organization: "kos",
    burnout: "burnout",
    burnout_pi: "burnout_pi",
    reliability: "sectarianism",
  };
  return map[key] ?? null;
}
