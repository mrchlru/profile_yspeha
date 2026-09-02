import type { AuditInternalKey } from "@/lib/audit/auditTypes";

/** Короткие подписи шагов для dev-навигации. */
export const AUDIT_STEP_DEV_TITLES: Readonly<Record<AuditInternalKey, string>> = {
  rowe_decision_styles: "Стили решений Роу (80)",
  goal_pursuit_short: "Целеустремлённость (10)",
  paperwork_style_short: "Стиль документов (12)",
  snyder_self_monitoring: "Самомониторинг Снайдера (25)",
  schubert_risk_full: "Риск Шуберта (25)",
  type_a_jenkins_short: "Тип А Дженкинса (20)",
  strelyau_temperament_short: "Темперамент Стреляу (15)",
  rotter_locus: "Локус Роттера (29)",
  tolerance_likert7_33: "Толерантность Корнилова (33)",
  cfit_subtest_1: "CFIT ч.I с.1 — серия (12)",
  cfit_subtest_2: "CFIT ч.I с.2 — лишняя (14)",
  cfit_subtest_3: "CFIT ч.I с.3 — дополнить (12)",
  cfit_subtest_4: "CFIT ч.I с.4 — точка (8)",
  cfit_subtest_5: "CFIT ч.II с.1 — серия (12)",
  cfit_subtest_6: "CFIT ч.II с.2 — лишняя (14)",
  cfit_subtest_7: "CFIT ч.II с.3 — дополнить (12)",
  cfit_subtest_8: "CFIT ч.II с.4 — точка (8)",
  keirsey_temperament: "Кейрси (70)",
  maslach_burnout: "Выгорание Рукавишникова (72)",
  thomas_kilmann_conflict: "Томас–Килманн (30)",
  gerchikov_motivation_full: "Герчиков (16)",
  pochebut_loyalty: "Почебут лояльность (36)",
  kos_communicative_organizational: "КОС (40)",
  general_erudition_pool: "Эрудиция",
  maslach_mbi_short: "Маслач MBI (22)",
  sectarianism_screening: "Сектантство (38)",
};

/** Возвращает короткую подпись шага для dev-навигации. */
export function getAuditStepDevTitle(key: AuditInternalKey): string {
  return AUDIT_STEP_DEV_TITLES[key] ?? key;
}
