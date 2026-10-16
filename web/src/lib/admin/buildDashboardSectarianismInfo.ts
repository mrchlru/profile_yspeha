import { AUDIT_STEP_26_QUESTION_COUNT } from "@/lib/audit/questions/step26Sectarianism";
import {
  SECTARIANISM_CLEAR_CONCLUSION,
  SECTARIANISM_DETECTION_THRESHOLD_PERCENT,
  SECTARIANISM_PROFILE_KEYS,
  type SectarianismProfileId,
} from "@/lib/audit/report/keys/sectarianismScoringKey";
import { getSectarianismProfileDescription } from "@/lib/audit/report/sectarianismProfiles";
import type { DashboardMethodologyInfo } from "@/lib/admin/dashboardMethodologyInfoTypes";

/** Порядок профилей как в сводке HR и на диаграмме дашборда. */
const DASHBOARD_SECTARIAN_PROFILE_ORDER: ReadonlyArray<SectarianismProfileId> = [
  "jehovah_witnesses",
  "herbalife",
  "scientology",
  "deir",
  "hizb_ut_tahrir_wahhabism",
  "new_acropolis",
];

/**
 * Справка для дашборда: пороги, логика «Благонадёжности» и профили из ключей системы.
 */
export function buildDashboardSectarianismInfo(): DashboardMethodologyInfo {
  const keysById = new Map(SECTARIANISM_PROFILE_KEYS.map((profile) => [profile.id, profile]));

  const profileItems = DASHBOARD_SECTARIAN_PROFILE_ORDER.map((id) => {
    const key = keysById.get(id);
    const description = getSectarianismProfileDescription(id);
    const name = key?.displayName ?? description?.heading ?? id;
    const summary = description?.characteristic ?? "Профиль деструктивной группы из ключа теста.";
    const short =
      summary.length > 220 ? `${summary.slice(0, 217).trim()}…` : summary;
    return `${name} — ${short}`;
  });

  return {
    title: "Тест на выявление сектантства",
    paragraphs: [
      "Скрининговый опросник (38 вопросов) сопоставляет ответы с ключом по шести профилям деструктивных и totalitarных групп. Для каждого профиля суммируются веса совпавших ответов.",
    ],
    sections: [
      {
        title: "Пороги и выводы",
        items: [
          `Профиль считается выявленным, если сумма весов совпадений ≥ ${String(SECTARIANISM_DETECTION_THRESHOLD_PERCENT)}%.`,
          `На диаграмме дашборда красная зона начинается с ${String(SECTARIANISM_DETECTION_THRESHOLD_PERCENT)}%.`,
          `Если ни один профиль не достиг порога: «${SECTARIANISM_CLEAR_CONCLUSION}».`,
          `Полная интерпретация доступна после ответа на все ${String(AUDIT_STEP_26_QUESTION_COUNT)} вопросов.`,
        ],
      },
      {
        title: "Показатель «Благонадёжность» на дашборде",
        items: [
          "Считается как 100% минус максимальный процент риска среди всех профилей.",
          "Чем выше риск по любой секте, тем ниже благонадёжность.",
          "Подпись «Выявлены признаки» — хотя бы один профиль достиг порога выявления.",
        ],
      },
      {
        title: "Профили в ключе теста",
        items: profileItems,
      },
    ],
  };
}
