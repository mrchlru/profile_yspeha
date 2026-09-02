/**
 * Типы для теста «Аудит состояния». Полностью изолированы от скрининга.
 *
 * Хронология восстановлена по предоставленным материалам (Хронология аудита состояния.docx,
 * 24 файла с тестами и скриншотами Fisom lab). Анкета (Тест 10 в исходной хронологии)
 * по требованию заказчика исключена.
 *
 * Тесты подписываются *без официальных названий методик* — на экране показывается
 * сухая инструкция, как у Fisom lab. Авторы/названия методик хранятся только в коде
 * как `internalKey` для целей реализации ключей и заключения.
 */

/** Тип ответа в рамках одного шага аудита. Определяет, какой UI рендерится. */
export type AuditAnswerKind =
  /** Пары утверждений: выбор одного из двух (a/b). Используется для шага 1 (стили), 8 (Роттер), 18 (Кейрси), 20 (Томас). */
  | "pair_ab"
  /** Один вариант из трёх и более кнопок (без шкалы). Шаг 2 — 10 вопросов из 3 вариантов. */
  | "mcq_single"
  /** 4-балльная шкала ответа (например, «совершенно не согласен / скорее не согласен / скорее согласен / совершенно согласен»). Шаг 3. */
  | "likert_4"
  /** Бинарный ответ «верно / неверно». Шаг 4. */
  | "true_false"
  /** 5-балльная шкала (от «никогда» до «всегда» и т. п.). Шаг 5. */
  | "likert_5"
  /** Тройной ответ «да / нет / не знаю». Шаг 6. */
  | "yes_no_unknown"
  /** Бинарный ответ «да / нет». Шаги 7, 23. */
  | "yes_no"
  /** 7-балльная шкала согласия («полностью не согласен» … «полностью согласен»). Шаг 9. */
  | "likert_7"
  /** Графическая задача CFIT: выбор одной из 5 картинок (a–e). Шаги 10–15. */
  | "cfit_choice5"
  /** 4-балльный частотный ответ для опросника выгорания (Рукавишников): «никогда / редко / часто / обычно». Шаг 17. */
  | "frequency_4"
  /** Мотивация (Герчиков): в каждом пункте — свой формат (один или несколько вариантов, либо шкала 1–10 для дохода). Шаг 21. */
  | "gerchikov_mixed"
  /** 11-балльная шкала от 1 до 11 (6 — нейтральная). Шаг 22 (лояльность). */
  | "likert_11"
  /** 7-балльная шкала частоты Маслач (0 — «никогда» … 6 — «всегда»). Шаг 25. */
  | "maslach_likert_7";

/** Метаданные шага аудита. */
export type AuditStepConfig = {
  /** Порядковый номер шага в маршруте (1..AUDIT_TOTAL_STEPS). */
  stepIndex: number;
  /**
   * Слаг в URL: `/audit/<slug>`. Сделан коротким, чтобы пользователь видел понятный путь
   * и при этом мы не раскрывали в URL «официальные» названия методик.
   */
  slug: string;
  /** Тип UI ответа. */
  answerKind: AuditAnswerKind;
  /** Кол-во заданий в шаге (или `null`, если число вопросов в пуле плавающее, как у эрудиции). */
  itemCount: number | null;
  /** Лимит времени в секундах. `null` — без таймера. */
  timerSeconds: number | null;
  /**
   * Сухой текст инструкции, как на экране Fisom lab (без названий методик).
   * Подгружается из `auditIntros.ts`.
   */
  introKey: AuditIntroKey;
  /**
   * Внутренний ключ методики для реализации логики ключей/баллов.
   * НЕ показывается пользователю.
   */
  internalKey: AuditInternalKey;
  /**
   * Подсказка: «после нажатия Далее запустится таймер» — нужна для всех шагов с `timerSeconds !== null`.
   * Дублируется в текстах инструкций.
   */
  hasTimedFlow: boolean;
  /**
   * Шаг продолжает таймер предыдущего шага и не показывает экран инструкции.
   * Используется для пары «КОС-1 → эрудиция»: после полного заполнения шага 21
   * пользователь автоматически попадает на шаг 24, а таймер продолжает докручивать
   * время, оставшееся со старта шага 21 (без сброса до 18 минут).
   */
  joinPreviousStep?: boolean;
};

/** Ключи интро-текстов; маппинг → текст хранится в `auditIntros.ts`. */
export type AuditIntroKey =
  | "intro_pairs_80"
  | "intro_mcq3_10"
  | "intro_likert4_12"
  | "intro_truefalse_25"
  | "intro_likert5_25"
  | "intro_yesno_unknown_20"
  | "intro_yesno_15"
  | "intro_pairs_29"
  | "intro_likert7_33"
  | "intro_cfit_1"
  | "intro_cfit_2"
  | "intro_cfit_3"
  | "intro_cfit_4"
  | "intro_cfit_5"
  | "intro_cfit_6"
  | "intro_cfit_7"
  | "intro_cfit_8"
  | "intro_keirsey_70"
  | "intro_mbi_72"
  | "intro_thomas_30"
  | "intro_gerchikov_17"
  | "intro_likert11_36"
  | "intro_yesno_40"
  | "intro_erudition"
  | "intro_maslach_mbi_22"
  | "intro_sectarianism_38";

/** Внутренний ключ методики (для расчёта баллов в будущих PR). */
export type AuditInternalKey =
  | "rowe_decision_styles" // шаг 1: стили принятия решений (Алан Роу)
  | "goal_pursuit_short" // шаг 2: краткий опросник целеустремлённости (10 MCQ из 3 вариантов)
  | "paperwork_style_short" // шаг 3: стиль работы с документами (12 утверждений, 4-балльная шкала)
  | "snyder_self_monitoring" // шаг 4
  | "schubert_risk_full" // шаг 5
  | "type_a_jenkins_short" // шаг 6
  | "strelyau_temperament_short" // шаг 7
  | "rotter_locus" // шаг 8
  | "tolerance_likert7_33" // шаг 9: толерантность к неопределённости (33 утверждения × 7-балльная шкала)
  | "cfit_subtest_1"
  | "cfit_subtest_2"
  | "cfit_subtest_3"
  | "cfit_subtest_4"
  | "cfit_subtest_5"
  | "cfit_subtest_6"
  | "cfit_subtest_7"
  | "cfit_subtest_8"
  | "keirsey_temperament" // шаг 18
  | "maslach_burnout" // шаг 19
  | "thomas_kilmann_conflict" // шаг 20
  | "gerchikov_motivation_full" // шаг 21
  | "pochebut_loyalty" // шаг 22
  | "kos_communicative_organizational" // шаг 23
  | "general_erudition_pool" // шаг 24
  | "maslach_mbi_short" // шаг 25 — MBI Маслач (22 утверждения)
  | "sectarianism_screening"; // шаг 26 — тест на сектантство (скрининг)

/** Тип одного ответа на задание — союз по `AuditAnswerKind`. */
export type AuditAnswerValue =
  | { kind: "pair_ab"; value: "a" | "b" | null }
  | { kind: "mcq_single"; value: string | null }
  | { kind: "likert_4"; value: 1 | 2 | 3 | 4 | null }
  | { kind: "true_false"; value: "true" | "false" | null }
  | { kind: "likert_5"; value: 1 | 2 | 3 | 4 | 5 | null }
  | { kind: "yes_no_unknown"; value: "yes" | "no" | "unknown" | null }
  | { kind: "yes_no"; value: "yes" | "no" | null }
  | { kind: "likert_7"; value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null }
  | { kind: "cfit_choice5"; value: "1" | "2" | "3" | "4" | "5" | null }
  | { kind: "frequency_4"; value: "never" | "rare" | "often" | "usually" | null }
  | { kind: "gerchikov_mixed"; value: GerchikovAnswerSlot | null }
  | { kind: "likert_11"; value: number | null }
  | { kind: "maslach_likert_7"; value: 0 | 1 | 2 | 3 | 4 | 5 | 6 | null };

/**
 * Слот ответа Герчикова: в одних пунктах нужен один вариант, в других — несколько,
 * в пункте про доход — шкала 1..10. Точная структура будет уточнена при реализации шага.
 */
export type GerchikovAnswerSlot =
  | { mode: "single"; choice: string }
  | { mode: "multi"; choices: string[] }
  | { mode: "scale10"; value: number };
