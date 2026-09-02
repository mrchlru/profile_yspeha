/**
 * Шаг 21 аудита — мотивация и стимулирование персонала (тест Герчикова).
 * 16 пунктов «смешанного» формата: short-input (паспортичка), одиночный выбор,
 * множественный выбор «1–2», множественный выбор «любое число», матрица
 * «важно / не очень / совсем не важно» по 9 источникам дохода, а также вопрос
 * Q18 с ветвлением «руководитель / не руководитель» по ответу на Q1.
 *
 * Источник: `screen-research-audit/тесты и ключи к ним/Тест 14.docx`
 * (и тот же исходник на studfile.net, ссылку на который заказчик оставил
 * в начале документа). И в DOCX, и на studfile отсутствуют формулировки
 * вопросов 7 и 8 — поэтому в этом шаге их нет, итог — 16 пунктов.
 *
 * Официальное название методики пользователю не показывается — см. правило
 * по подписям тестов из чата.
 */

export type AuditStep21Option = {
  id: string;
  label: string;
};

export type AuditStep21MatrixColumn = AuditStep21Option;

/**
 * Один пункт анкеты. `id` используется как ключ ответа в `AuditStepAnswers`
 * (`q1`..`q16`), `sourceLabel` — это исходный номер вопроса из материалов
 * заказчика (например, `5` или `18`) и показывается в карточке для
 * совместимости с печатными бланками.
 */
export type AuditStep21Question =
  | {
      id: string;
      sourceLabel: string;
      kind: "passport_single";
      prompt: string;
      options: ReadonlyArray<AuditStep21Option>;
    }
  | {
      id: string;
      sourceLabel: string;
      kind: "passport_number";
      prompt: string;
      placeholder: string;
    }
  | {
      id: string;
      sourceLabel: string;
      kind: "passport_tenure";
      prompt: string;
    }
  | {
      id: string;
      sourceLabel: string;
      kind: "single";
      prompt: string;
      hint: string;
      options: ReadonlyArray<AuditStep21Option>;
    }
  | {
      id: string;
      sourceLabel: string;
      kind: "multi_one_or_two";
      prompt: string;
      hint: string;
      options: ReadonlyArray<AuditStep21Option>;
    }
  | {
      id: string;
      sourceLabel: string;
      kind: "multi_any";
      prompt: string;
      hint: string;
      options: ReadonlyArray<AuditStep21Option>;
    }
  | {
      id: string;
      sourceLabel: string;
      kind: "matrix_importance";
      prompt: string;
      hint: string;
      rows: ReadonlyArray<{ id: string; label: string }>;
      columns: ReadonlyArray<AuditStep21MatrixColumn>;
    }
  | {
      id: string;
      sourceLabel: string;
      kind: "branched_18";
      hint: string;
      managerPrompt: string;
      managerOptions: ReadonlyArray<AuditStep21Option>;
      nonManagerPrompt: string;
      nonManagerOptions: ReadonlyArray<AuditStep21Option>;
      /** id вопроса-индикатора (q1) и значение «руководитель». */
      managerQuestionId: "q1";
      managerOptionId: "manager";
    };

const IMPORTANCE_COLUMNS: ReadonlyArray<AuditStep21MatrixColumn> = [
  { id: "very", label: "Очень важно" },
  { id: "somewhat", label: "Не очень важно" },
  { id: "not", label: "Совсем не важно" },
];

export const AUDIT_STEP_21_QUESTIONS: ReadonlyArray<AuditStep21Question> = [
  {
    id: "q1",
    sourceLabel: "1",
    kind: "passport_single",
    prompt: "Ваша позиция в организации",
    options: [
      { id: "manager", label: "Управляющий" },
      { id: "staff", label: "Служащий" },
      { id: "worker", label: "Рабочий" },
    ],
  },
  {
    id: "q2",
    sourceLabel: "2",
    kind: "passport_single",
    prompt: "Ваш пол",
    options: [
      { id: "male", label: "Мужской" },
      { id: "female", label: "Женский" },
    ],
  },
  {
    id: "q3",
    sourceLabel: "3",
    kind: "passport_number",
    prompt: "Ваш возраст",
    placeholder: "Например: 32",
  },
  {
    id: "q4",
    sourceLabel: "4",
    kind: "passport_tenure",
    prompt: "Как долго Вы работаете в данной организации?",
  },
  {
    id: "q5",
    sourceLabel: "5",
    kind: "multi_one_or_two",
    prompt: "Что Вы больше всего цените в своей работе?",
    hint: "Дайте один или два ответа",
    options: [
      { id: "a1", label: "Что я в основном сам решаю, что и как мне делать." },
      {
        id: "a2",
        label: "Что она даёт мне возможность проявить то, что я знаю и умею.",
      },
      { id: "a3", label: "Что я чувствую себя полезным и нужным." },
      { id: "a4", label: "Что мне за неё относительно неплохо платят." },
      {
        id: "a5",
        label:
          "Особенно ничего не ценю, но эта работа мне хорошо знакома и привычна.",
      },
      { id: "a6", label: "Другое" },
    ],
  },
  {
    id: "q6",
    sourceLabel: "6",
    kind: "single",
    prompt: "Какое выражение из ниже перечисленных Вам подходит более всего?",
    hint: "Дайте только один ответ",
    options: [
      {
        id: "a1",
        label:
          "Я могу обеспечить своим трудом себе и своей семье приличный доход.",
      },
      { id: "a2", label: "В своей работе я — полный хозяин." },
      {
        id: "a3",
        label:
          "У меня достаточно знаний и опыта, чтобы справиться с любыми трудностями в моей работе.",
      },
      { id: "a4", label: "Я — ценный, незаменимый для организации работник." },
      { id: "a5", label: "Я всегда выполняю то, что от меня требуют." },
      { id: "a6", label: "Другое" },
    ],
  },
  {
    id: "q7",
    sourceLabel: "9",
    kind: "multi_one_or_two",
    prompt: "Попробуйте определить, что для Вас означает Ваш заработок?",
    hint: "Дайте один или два ответа",
    options: [
      {
        id: "a1",
        label: "Плата за время и усилия, потраченные на выполнение работы.",
      },
      {
        id: "a2",
        label: "Это, прежде всего, плата за мои знания, квалификацию.",
      },
      {
        id: "a3",
        label:
          "Оплата за мой трудовой вклад в общие результаты деятельности организации.",
      },
      {
        id: "a4",
        label:
          "Мне нужен гарантированный заработок — пусть небольшой, но чтобы он был.",
      },
      { id: "a5", label: "Какой бы он ни был, я его заработал(а) сам(а)." },
      { id: "a6", label: "Другое" },
    ],
  },
  {
    id: "q8",
    sourceLabel: "10",
    kind: "matrix_importance",
    prompt: "Как Вы относитесь к перечисленным ниже источникам дохода?",
    hint:
      "По каждой строке отметьте ту колонку, которая больше всего соответствует Вашему мнению.",
    rows: [
      { id: "r1", label: "Заработная плата и премии, пенсии, стипендии" },
      { id: "r2", label: "Доплаты за квалификацию" },
      { id: "r3", label: "Доплаты за тяжёлые и вредные условия" },
      { id: "r4", label: "Социальные выплаты и льготы, пособия" },
      { id: "r5", label: "Доходы от капитала, акций" },
      { id: "r6", label: "Любые дополнительные приработки" },
      {
        id: "r7",
        label: "Приработки, но не любые, а только по своей специальности",
      },
      { id: "r8", label: "Доходы от личного хозяйства, дачного хозяйства" },
      { id: "r9", label: "Выигрыш в лотерею, казино и пр." },
    ],
    columns: IMPORTANCE_COLUMNS,
  },
  {
    id: "q9",
    sourceLabel: "11",
    kind: "single",
    prompt:
      "На каких принципах, по-вашему, должны строиться отношения между работником и организацией?",
    hint: "Дайте только один ответ",
    options: [
      {
        id: "a1",
        label:
          "Работник должен относиться к организации как к своему дому, отдавать ей все и вместе переживать трудности и подъёмы. Организация должна соответственно оценивать преданность и труд работника.",
      },
      {
        id: "a2",
        label:
          "Работник продаёт организации свой труд, и если ему не дают хорошую цену, он вправе найти другого покупателя.",
      },
      {
        id: "a3",
        label:
          "Работник приходит в организацию для самореализации и относится к ней, как к месту реализации своих способностей. Организация должна обеспечивать работнику такую возможность, чтобы извлекать из этого выгоду для себя и на этой основе развиваться.",
      },
      {
        id: "a4",
        label:
          "Работник тратит на организацию свои силы, а организация должна взамен гарантировать ему зарплату и социальные блага.",
      },
      { id: "a5", label: "Другое" },
    ],
  },
  {
    id: "q10",
    sourceLabel: "12",
    kind: "multi_one_or_two",
    prompt:
      "Как Вы считаете, почему в процессе работы люди проявляют инициативу, вносят различные предложения?",
    hint: "Дайте один или два ответа",
    options: [
      { id: "a1", label: "Чувствуют особую ответственность за свою работу." },
      {
        id: "a2",
        label:
          "Из-за стремления реализовать свои знания и опыт, выйти за установленные работой рамки.",
      },
      {
        id: "a3",
        label: "Чаще всего из-за желания улучшить работу своей организации.",
      },
      {
        id: "a4",
        label: "Просто хотят «выделиться» или завоевать расположение начальства.",
      },
      {
        id: "a5",
        label:
          "Хотят заработать, поскольку всякая полезная инициатива должна вознаграждаться.",
      },
      { id: "a6", label: "Другое" },
    ],
  },
  {
    id: "q11",
    sourceLabel: "13",
    kind: "multi_one_or_two",
    prompt: "Какое суждение о коллективной работе Вам ближе?",
    hint: "Дайте один или два ответа",
    options: [
      {
        id: "a1",
        label:
          "Коллектив для меня очень важен, одному хороших результатов не добиться.",
      },
      {
        id: "a2",
        label:
          "Предпочитаю работать автономно, но также чувствую себя хорошо, когда работаю вместе с интересными людьми.",
      },
      {
        id: "a3",
        label: "Мне нужна свобода действий, а коллектив чаще всего эту свободу ограничивает.",
      },
      {
        id: "a4",
        label: "Можно работать и в коллективе, но платить должны по личным результатам.",
      },
      { id: "a5", label: "Мне нравится работать в коллективе, так как там я — среди своих." },
      { id: "a6", label: "Другое" },
    ],
  },
  {
    id: "q12",
    sourceLabel: "14",
    kind: "multi_one_or_two",
    prompt:
      "Представьте, что у вас появился шанс стать владельцем Вашей организации. Воспользуетесь ли Вы этой возможностью?",
    hint: "Дайте один или два ответа",
    options: [
      { id: "a1", label: "Да, так как я смогу участвовать в управлении организацией." },
      { id: "a2", label: "Да, потому что это может увеличить мой доход." },
      { id: "a3", label: "Да, так как настоящий работник должен быть совладельцем." },
      {
        id: "a4",
        label:
          "Вряд ли: на заработке это не скажется, участие в управлении меня не интересует, а работе это помешает.",
      },
      { id: "a5", label: "Нет, не нужны мне лишние заботы." },
      { id: "a6", label: "Другое" },
    ],
  },
  {
    id: "q13",
    sourceLabel: "15",
    kind: "multi_one_or_two",
    prompt:
      "Представьте, что Вы сейчас ищете работу. Вам предлагают несколько работ. Какую из них Вы выберете?",
    hint: "Дайте один или два ответа",
    options: [
      { id: "a1", label: "Наиболее интересную, творческую." },
      { id: "a2", label: "Наиболее самостоятельную, независимую." },
      { id: "a3", label: "За которую больше платят." },
      {
        id: "a4",
        label:
          "Чтобы за не слишком большие деньги не требовалось особенно «надрываться».",
      },
      { id: "a5", label: "Не могу представить, что я уйду из нашей организации." },
      { id: "a6", label: "Другое" },
    ],
  },
  {
    id: "q14",
    sourceLabel: "16",
    kind: "multi_one_or_two",
    prompt:
      "Что Вы прежде всего учитываете, когда оцениваете успехи другого работника в Вашей организации?",
    hint: "Дайте один или два ответа",
    options: [
      { id: "a1", label: "Его зарплату, доходы, материальное положение." },
      { id: "a2", label: "Уровень его профессионализма, квалификации." },
      { id: "a3", label: "Насколько хорошо он «устроился»." },
      { id: "a4", label: "Насколько его уважают в организации." },
      { id: "a5", label: "Насколько он самостоятелен, независим." },
      { id: "a6", label: "Другое" },
    ],
  },
  {
    id: "q15",
    sourceLabel: "17",
    kind: "multi_any",
    prompt:
      "Если положение в Вашей организации ухудшится, на какие перемены в Вашей работе и положении Вы согласитесь ради того, чтобы остаться на работе?",
    hint: "Можете дать любое число ответов",
    options: [
      { id: "a1", label: "Освоить новую профессию." },
      {
        id: "a2",
        label:
          "Работать неполный рабочий день или перейти на менее квалифицированную работу и меньше получать.",
      },
      { id: "a3", label: "Перейти на менее удобный режим работы." },
      { id: "a4", label: "Работать более интенсивно." },
      { id: "a5", label: "Соглашусь просто терпеть потому, что деваться некуда." },
      { id: "a6", label: "Другое" },
      { id: "a7", label: "Скорее всего, я просто уйду из организации." },
    ],
  },
  {
    id: "q16",
    sourceLabel: "18",
    kind: "branched_18",
    hint: "Дайте один или два ответа",
    managerQuestionId: "q1",
    managerOptionId: "manager",
    managerPrompt:
      "Если Вы — руководитель, то что Вас привлекает в этой должности больше всего?",
    managerOptions: [
      {
        id: "a1",
        label: "Возможность принимать самостоятельные, ответственные решения.",
      },
      { id: "a2", label: "Возможность принести наибольшую пользу организации." },
      { id: "a3", label: "Высокий уровень оплаты." },
      { id: "a4", label: "Возможность организовывать работу других людей." },
      {
        id: "a5",
        label: "Возможность наилучшим образом применить свои знания и умения.",
      },
      { id: "a6", label: "Другое" },
      {
        id: "a7",
        label:
          "Ничего особенно не привлекает, за положение руководителя не держусь.",
      },
    ],
    nonManagerPrompt:
      "Если Вы не являетесь руководителем, то хотели бы Вы им стать?",
    nonManagerOptions: [
      {
        id: "b1",
        label:
          "Да, поскольку это даст возможность принимать самостоятельные, ответственные решения.",
      },
      { id: "b2", label: "Не против, если нужно для пользы дела." },
      {
        id: "b3",
        label: "Да, так как при этом я смогу лучше применить свои знания и умения.",
      },
      { id: "b4", label: "Да, если это будет должным образом оплачиваться." },
      { id: "b5", label: "Нет, профессионал может отвечать только за самого себя." },
      {
        id: "b6",
        label:
          "Нет, руководство меня не привлекает, а хорошо заработать я могу и на своём месте.",
      },
      { id: "b7", label: "Да, чем я хуже других?" },
      { id: "b8", label: "Нет, это слишком большая нагрузка для меня." },
      { id: "b9", label: "Другое" },
    ],
  },
];

/**
 * Считает «отвеченный» статус для одного пункта Герчикова. Каждый формат
 * имеет свою логику: для матрицы все 9 строк должны быть заполнены, для
 * стажа — годы и месяцы вместе, для multi-1-2 — от 1 до 2 вариантов, и т.д.
 *
 * Используется компонентом-телом шага 21 как замена универсальной
 * `getStepAnsweredCount`, чтобы прогресс-бар не «прыгал» от частично
 * заполненной матрицы.
 */
export function isAuditStep21QuestionAnswered(
  question: AuditStep21Question,
  rawValue: unknown
): boolean {
  if (rawValue === null || rawValue === undefined) {
    return false;
  }
  switch (question.kind) {
    case "passport_single":
    case "single":
      return typeof rawValue === "string" && rawValue.length > 0;
    case "passport_number":
      return typeof rawValue === "string" && rawValue.trim().length > 0;
    case "passport_tenure": {
      if (!Array.isArray(rawValue) || rawValue.length !== 2) {
        return false;
      }
      const [years, months] = rawValue;
      return (
        typeof years === "string" &&
        typeof months === "string" &&
        years.trim().length > 0 &&
        months.trim().length > 0
      );
    }
    case "multi_one_or_two":
      return (
        Array.isArray(rawValue) &&
        rawValue.length >= 1 &&
        rawValue.length <= 2
      );
    case "multi_any":
      return Array.isArray(rawValue) && rawValue.length >= 1;
    case "matrix_importance": {
      if (!Array.isArray(rawValue) || rawValue.length !== question.rows.length) {
        return false;
      }
      const allowed = new Set(question.columns.map((c) => c.id));
      return rawValue.every(
        (cell) => typeof cell === "string" && allowed.has(cell)
      );
    }
    case "branched_18":
      return (
        Array.isArray(rawValue) &&
        rawValue.length >= 1 &&
        rawValue.length <= 2
      );
  }
}

/**
 * Общее число отвеченных пунктов Герчикова в шаге 21. Подставляется в
 * `AuditQuestionsLayout` вместо `getStepAnsweredCount`, чтобы прогресс
 * учитывал именно «правильно заполненные» сложные форматы (матрица, стаж).
 */
export function countAuditStep21Answered(
  questions: ReadonlyArray<AuditStep21Question>,
  answers: Record<string, unknown>
): number {
  let n = 0;
  for (const q of questions) {
    if (isAuditStep21QuestionAnswered(q, answers[q.id])) {
      n += 1;
    }
  }
  return n;
}
