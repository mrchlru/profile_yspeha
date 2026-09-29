import type { AttestationBlockId } from "@/lib/attestation/attestationBlocks";

export type MiniIpipFactor =
  | "Extraversion"
  | "Agreeableness"
  | "Conscientiousness"
  | "Neuroticism"
  | "Openness";

export type ManagementPotentialScale =
  | "decision_making"
  | "delegation"
  | "stress_resilience"
  | "team_leadership"
  | "integrity";

export type CbiScale = "personal" | "work";

export type SpielbergerScale = "state" | "trait";

/** Тип профессиональной направленности (ДДО Климова). */
export type KlimovProfessionType =
  | "human_nature"
  | "human_technique"
  | "human_human"
  | "human_sign_system"
  | "human_artistic_image";

export type RosenzweigSituationKind = "obstacle" | "accusation";

export type LikertOption = {
  id: number;
  label: string;
};

export type CbiOption = {
  id: number;
  label: string;
  score: 0 | 25 | 50 | 75 | 100;
};

export type MiniIpipQuestion = {
  id: string;
  text: string;
  factor: MiniIpipFactor;
  reverse: boolean;
};

export type ManagementPotentialQuestion = {
  id: string;
  text: string;
  scale: ManagementPotentialScale;
  reverse: boolean;
};

export type CbiQuestion = {
  id: string;
  text: string;
  scale: CbiScale;
  reverse: boolean;
};

export type SpielbergerQuestion = {
  id: string;
  text: string;
  scale: SpielbergerScale;
  reverse: boolean;
};

export type KlimovDdoQuestion = {
  id: string;
  optionA: string;
  optionB: string;
  typeIfA: KlimovProfessionType;
  typeIfB: KlimovProfessionType;
};

export type LuscherColor = {
  id: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  name: string;
  hex: string;
};

export type RosenzweigSituation = {
  id: string;
  text: string;
  situationKind: RosenzweigSituationKind;
};

/** Ключ ответа ранга цвета Люшера: `luscher_rank_0` … `luscher_rank_7`. */
export function luscherRankAnswerKey(colorId: number): string {
  return `luscher_rank_${String(colorId)}`;
}

export const MINI_IPIP_OPTIONS: ReadonlyArray<LikertOption> = [
  { id: 1, label: "Совершенно неточно" },
  { id: 2, label: "Скорее неточно" },
  { id: 3, label: "Нейтрально" },
  { id: 4, label: "Скорее точно" },
  { id: 5, label: "Совершенно точно" },
];

export const MP_OPTIONS: ReadonlyArray<LikertOption> = [
  { id: 1, label: "Совершенно не согласен" },
  { id: 2, label: "Скорее не согласен" },
  { id: 3, label: "Нейтрально" },
  { id: 4, label: "Скорее согласен" },
  { id: 5, label: "Полностью согласен" },
];

export const CBI_OPTIONS: ReadonlyArray<CbiOption> = [
  { id: 0, label: "Никогда / почти никогда", score: 0 },
  { id: 1, label: "Редко", score: 25 },
  { id: 2, label: "Иногда", score: 50 },
  { id: 3, label: "Часто", score: 75 },
  { id: 4, label: "Всегда", score: 100 },
];

export const SPIELBERGER_OPTIONS: ReadonlyArray<LikertOption> = [
  { id: 1, label: "Нет, это не так" },
  { id: 2, label: "Скорее не так" },
  { id: 3, label: "Скорее так" },
  { id: 4, label: "Совершенно верно" },
];

export const MINI_IPIP_QUESTIONS: ReadonlyArray<MiniIpipQuestion> = [
  { id: "mip_q1", text: "Я — душа компании", factor: "Extraversion", reverse: false },
  { id: "mip_q2", text: "Я немногословен(-на)", factor: "Extraversion", reverse: true },
  { id: "mip_q3", text: "Мне комфортно среди людей", factor: "Extraversion", reverse: false },
  { id: "mip_q4", text: "Предпочитаю оставаться в тени", factor: "Extraversion", reverse: true },
  { id: "mip_q5", text: "Сочувствую чувствам других людей", factor: "Agreeableness", reverse: false },
  { id: "mip_q6", text: "Меня не интересуют проблемы других людей", factor: "Agreeableness", reverse: true },
  { id: "mip_q7", text: "Чувствую эмоции других людей", factor: "Agreeableness", reverse: false },
  { id: "mip_q8", text: "Меня не особо интересуют другие люди", factor: "Agreeableness", reverse: true },
  { id: "mip_q9", text: "Сразу берусь за поручения", factor: "Conscientiousness", reverse: false },
  { id: "mip_q10", text: "Часто забываю класть вещи на место", factor: "Conscientiousness", reverse: true },
  { id: "mip_q11", text: "Люблю порядок", factor: "Conscientiousness", reverse: false },
  { id: "mip_q12", text: "Устраиваю беспорядок в делах", factor: "Conscientiousness", reverse: true },
  { id: "mip_q13", text: "У меня часто меняется настроение", factor: "Neuroticism", reverse: false },
  { id: "mip_q14", text: "В основном я спокоен(-йна)", factor: "Neuroticism", reverse: true },
  { id: "mip_q15", text: "Легко расстраиваюсь", factor: "Neuroticism", reverse: false },
  { id: "mip_q16", text: "Редко бываю в подавленном настроении", factor: "Neuroticism", reverse: true },
  { id: "mip_q17", text: "У меня богатое воображение", factor: "Openness", reverse: false },
  { id: "mip_q18", text: "Меня не интересуют абстрактные идеи", factor: "Openness", reverse: true },
  { id: "mip_q19", text: "Мне сложно понимать абстрактные идеи", factor: "Openness", reverse: true },
  { id: "mip_q20", text: "У меня слабое воображение", factor: "Openness", reverse: true },
];

export const MANAGEMENT_POTENTIAL_QUESTIONS: ReadonlyArray<ManagementPotentialQuestion> = [
  {
    id: "mp_q1",
    text: "Я быстро принимаю решения даже при нехватке полной информации.",
    scale: "decision_making",
    reverse: false,
  },
  {
    id: "mp_q2",
    text: "Я откладываю решение, если чувствую неуверенность.",
    scale: "decision_making",
    reverse: true,
  },
  {
    id: "mp_q3",
    text: "Я готов брать на себя ответственность за решение, даже если оно окажется неверным.",
    scale: "decision_making",
    reverse: false,
  },
  {
    id: "mp_q4",
    text: "Мне сложно сделать выбор, когда есть несколько вариантов.",
    scale: "decision_making",
    reverse: true,
  },
  {
    id: "mp_q5",
    text: "Я анализирую последствия решения, прежде чем действовать.",
    scale: "decision_making",
    reverse: false,
  },
  {
    id: "mp_q6",
    text: "Я доверяю подчинённым выполнение важных задач.",
    scale: "delegation",
    reverse: false,
  },
  {
    id: "mp_q7",
    text: "Мне проще сделать работу самому, чем объяснять её другому.",
    scale: "delegation",
    reverse: true,
  },
  {
    id: "mp_q8",
    text: "Я регулярно передаю часть своих задач сотрудникам с потенциалом роста.",
    scale: "delegation",
    reverse: false,
  },
  {
    id: "mp_q9",
    text: "Я контролирую каждую мелочь в работе подчинённых.",
    scale: "delegation",
    reverse: true,
  },
  {
    id: "mp_q10",
    text: "Я даю сотрудникам свободу в выборе способа выполнения задачи.",
    scale: "delegation",
    reverse: false,
  },
  {
    id: "mp_q11",
    text: "В кризисной ситуации я сохраняю ясность мышления.",
    scale: "stress_resilience",
    reverse: false,
  },
  {
    id: "mp_q12",
    text: "Стресс на работе сильно снижает качество моих решений.",
    scale: "stress_resilience",
    reverse: true,
  },
  {
    id: "mp_q13",
    text: "Я быстро восстанавливаюсь после конфликтной ситуации.",
    scale: "stress_resilience",
    reverse: false,
  },
  {
    id: "mp_q14",
    text: "Мне трудно сосредоточиться, когда одновременно возникает несколько проблем.",
    scale: "stress_resilience",
    reverse: true,
  },
  {
    id: "mp_q15",
    text: "Я воспринимаю форс-мажор как рабочую задачу, а не как катастрофу.",
    scale: "stress_resilience",
    reverse: false,
  },
  {
    id: "mp_q16",
    text: "Команда обращается ко мне за решением сложных вопросов.",
    scale: "team_leadership",
    reverse: false,
  },
  {
    id: "mp_q17",
    text: "Мне сложно мотивировать людей, которые не разделяют моё мнение.",
    scale: "team_leadership",
    reverse: true,
  },
  {
    id: "mp_q18",
    text: "Я умею объединить разных людей вокруг общей цели.",
    scale: "team_leadership",
    reverse: false,
  },
  {
    id: "mp_q19",
    text: "Конфликты в команде я предпочитаю не замечать.",
    scale: "team_leadership",
    reverse: true,
  },
  {
    id: "mp_q20",
    text: "Я даю обратную связь сотрудникам регулярно, а не только по итогам периода.",
    scale: "team_leadership",
    reverse: false,
  },
  {
    id: "mp_q21",
    text: "Я довожу начатое дело до конца, даже если это скучно или сложно.",
    scale: "integrity",
    reverse: false,
  },
  {
    id: "mp_q22",
    text: "Иногда я закрываю глаза на мелкие нарушения стандартов, если «все так делают».",
    scale: "integrity",
    reverse: true,
  },
  {
    id: "mp_q23",
    text: "Для меня важно соответствовать стандартам компании даже без контроля.",
    scale: "integrity",
    reverse: false,
  },
  {
    id: "mp_q24",
    text: "Я могу оправдать нарушение правил, если результат того стоит.",
    scale: "integrity",
    reverse: true,
  },
  {
    id: "mp_q25",
    text: "Я честно признаю свою ошибку перед руководством, а не скрываю её.",
    scale: "integrity",
    reverse: false,
  },
];

export const CBI_QUESTIONS: ReadonlyArray<CbiQuestion> = [
  { id: "cbi_q1", text: "Как часто вы чувствуете усталость?", scale: "personal", reverse: false },
  { id: "cbi_q2", text: "Как часто вы физически истощены?", scale: "personal", reverse: false },
  { id: "cbi_q3", text: "Как часто вы эмоционально истощены?", scale: "personal", reverse: false },
  { id: "cbi_q4", text: "Как часто вы думаете: «Я больше не могу»?", scale: "personal", reverse: false },
  { id: "cbi_q5", text: "Как часто вы чувствуете себя измотанным(-ой)?", scale: "personal", reverse: false },
  {
    id: "cbi_q6",
    text: "Как часто вы чувствуете себя слабым(-ой) и подверженным(-ой) болезням?",
    scale: "personal",
    reverse: false,
  },
  { id: "cbi_q7", text: "Ваша работа эмоционально изнуряет вас?", scale: "work", reverse: false },
  { id: "cbi_q8", text: "Чувствуете ли вы себя выгоревшим(-ей) из-за работы?", scale: "work", reverse: false },
  { id: "cbi_q9", text: "Ваша работа вызывает у вас фрустрацию?", scale: "work", reverse: false },
  {
    id: "cbi_q10",
    text: "Чувствуете ли вы себя изнурённым(-ой) к концу рабочего дня?",
    scale: "work",
    reverse: false,
  },
  {
    id: "cbi_q11",
    text: "Чувствуете ли вы изнеможение уже утром при мысли о новом рабочем дне?",
    scale: "work",
    reverse: false,
  },
  {
    id: "cbi_q12",
    text: "Ощущаете ли вы, что каждый час работы утомителен для вас?",
    scale: "work",
    reverse: false,
  },
  {
    id: "cbi_q13",
    text: "Хватает ли вам энергии на семью и друзей в свободное время?",
    scale: "work",
    reverse: true,
  },
];

export const SPIELBERGER_QUESTIONS: ReadonlyArray<SpielbergerQuestion> = [
  { id: "sp_q1", text: "Я спокоен", scale: "state", reverse: true },
  { id: "sp_q2", text: "Мне ничто не угрожает", scale: "state", reverse: true },
  { id: "sp_q3", text: "Я нахожусь в напряжении", scale: "state", reverse: false },
  { id: "sp_q4", text: "Я испытываю сожаление", scale: "state", reverse: false },
  { id: "sp_q5", text: "Я чувствую себя свободно", scale: "state", reverse: true },
  { id: "sp_q6", text: "Я расстроен", scale: "state", reverse: false },
  { id: "sp_q7", text: "Меня волнуют возможные неудачи", scale: "state", reverse: false },
  { id: "sp_q8", text: "Я чувствую себя отдохнувшим", scale: "state", reverse: true },
  { id: "sp_q9", text: "Я встревожен", scale: "state", reverse: false },
  { id: "sp_q10", text: "Я испытываю чувство внутреннего удовлетворения", scale: "state", reverse: true },
  { id: "sp_q11", text: "Я уверен в себе", scale: "state", reverse: true },
  { id: "sp_q12", text: "Я нервничаю", scale: "state", reverse: false },
  { id: "sp_q13", text: "Я не нахожу себе места", scale: "state", reverse: false },
  { id: "sp_q14", text: "Я взвинчен", scale: "state", reverse: false },
  { id: "sp_q15", text: "Я не чувствую напряжения, скованности", scale: "state", reverse: true },
  { id: "sp_q16", text: "Я доволен", scale: "state", reverse: true },
  { id: "sp_q17", text: "Я озабочен", scale: "state", reverse: false },
  { id: "sp_q18", text: "Я слишком возбуждён, и мне не по себе", scale: "state", reverse: false },
  { id: "sp_q19", text: "Мне радостно", scale: "state", reverse: true },
  { id: "sp_q20", text: "Мне приятно", scale: "state", reverse: true },
  { id: "sp_q21", text: "У меня бывает приподнятое настроение", scale: "trait", reverse: true },
  { id: "sp_q22", text: "Я бываю раздражительным(-ой)", scale: "trait", reverse: false },
  { id: "sp_q23", text: "Я легко расстраиваюсь", scale: "trait", reverse: false },
  {
    id: "sp_q24",
    text: "Я хотел(-а) бы быть таким же удачливым(-ой), как и другие",
    scale: "trait",
    reverse: false,
  },
  {
    id: "sp_q25",
    text: "Я сильно переживаю неприятности и долго не могу о них забыть",
    scale: "trait",
    reverse: false,
  },
  { id: "sp_q26", text: "Я чувствую прилив сил, желание работать", scale: "trait", reverse: true },
  { id: "sp_q27", text: "Я спокоен, хладнокровен и собран", scale: "trait", reverse: true },
  { id: "sp_q28", text: "Меня тревожат возможные трудности", scale: "trait", reverse: false },
  { id: "sp_q29", text: "Я слишком переживаю из-за мелочей", scale: "trait", reverse: false },
  { id: "sp_q30", text: "Я бываю вполне счастлив(-а)", scale: "trait", reverse: true },
  { id: "sp_q31", text: "Я всё принимаю слишком близко к сердцу", scale: "trait", reverse: false },
  { id: "sp_q32", text: "Мне не хватает уверенности в себе", scale: "trait", reverse: false },
  { id: "sp_q33", text: "Я чувствую себя беззащитным(-ой)", scale: "trait", reverse: false },
  {
    id: "sp_q34",
    text: "Я стараюсь избегать критических ситуаций и трудностей",
    scale: "trait",
    reverse: false,
  },
  { id: "sp_q35", text: "У меня бывает хандра", scale: "trait", reverse: false },
  { id: "sp_q36", text: "Я бываю удовлетворён(-а)", scale: "trait", reverse: true },
  { id: "sp_q37", text: "Всякие пустяки отвлекают и волнуют меня", scale: "trait", reverse: false },
  { id: "sp_q38", text: "Бывает, что я чувствую себя неудачником(-цей)", scale: "trait", reverse: false },
  { id: "sp_q39", text: "Я уравновешенный человек", scale: "trait", reverse: true },
  {
    id: "sp_q40",
    text: "Меня охватывает беспокойство, когда я думаю о своих делах и заботах",
    scale: "trait",
    reverse: false,
  },
];

export const KLIMOV_DDO_QUESTIONS: ReadonlyArray<KlimovDdoQuestion> = [
  {
    id: "ddo_q1",
    optionA: "Ухаживать за животными",
    optionB: "Обслуживать машины, приборы",
    typeIfA: "human_nature",
    typeIfB: "human_technique",
  },
  {
    id: "ddo_q2",
    optionA: "Помогать больным людям, лечить их",
    optionB: "Составлять таблицы, схемы, программы для вычислительных машин",
    typeIfA: "human_human",
    typeIfB: "human_sign_system",
  },
  {
    id: "ddo_q3",
    optionA: "Следить за качеством книжных иллюстраций, плакатов, художественных открыток, грампластинок",
    optionB: "Следить за состоянием, развитием растений",
    typeIfA: "human_artistic_image",
    typeIfB: "human_nature",
  },
  {
    id: "ddo_q4",
    optionA: "Обрабатывать материалы (дерево, ткань, металл, пластмассу и т.п.)",
    optionB: "Доводить товары до потребителя, рекламировать, продавать",
    typeIfA: "human_technique",
    typeIfB: "human_human",
  },
  {
    id: "ddo_q5",
    optionA: "Обсуждать научно-популярные книги, статьи",
    optionB: "Обсуждать художественные книги (или пьесы, концерты)",
    typeIfA: "human_sign_system",
    typeIfB: "human_artistic_image",
  },
  {
    id: "ddo_q6",
    optionA: "Выращивать молодняк (животных какой-либо породы)",
    optionB: "Тренировать товарищей (или младших) в выполнении каких-либо действий (трудовых, учебных, спортивных)",
    typeIfA: "human_nature",
    typeIfB: "human_human",
  },
  {
    id: "ddo_q7",
    optionA: "Копировать рисунки, изображения (или настраивать музыкальные инструменты)",
    optionB: "Управлять каким-либо грузовым (подъёмным или транспортным) средством — краном, трактором, тепловозом и др.",
    typeIfA: "human_artistic_image",
    typeIfB: "human_technique",
  },
  {
    id: "ddo_q8",
    optionA: "Сообщать, разъяснять людям нужные им сведения (в справочном бюро, на экскурсии и т.д.)",
    optionB: "Художественно оформлять выставки, витрины (или участвовать в подготовке пьес, концертов)",
    typeIfA: "human_human",
    typeIfB: "human_artistic_image",
  },
  {
    id: "ddo_q9",
    optionA: "Ремонтировать вещи, изделия (одежду, технику), жилище",
    optionB: "Искать и исправлять ошибки в текстах, таблицах, рисунках",
    typeIfA: "human_technique",
    typeIfB: "human_sign_system",
  },
  {
    id: "ddo_q10",
    optionA: "Лечить животных",
    optionB: "Выполнять вычисления, расчёты",
    typeIfA: "human_nature",
    typeIfB: "human_sign_system",
  },
  {
    id: "ddo_q11",
    optionA: "Выводить новые сорта растений",
    optionB: "Конструировать, проектировать новые виды промышленных изделий (машины, одежду, дома, продукты питания и т.п.)",
    typeIfA: "human_nature",
    typeIfB: "human_technique",
  },
  {
    id: "ddo_q12",
    optionA: "Разбирать споры, ссоры между людьми, убеждать, разъяснять, поощрять, наказывать",
    optionB: "Разбираться в чертежах, схемах, таблицах (проверять, уточнять, приводить в порядок)",
    typeIfA: "human_human",
    typeIfB: "human_sign_system",
  },
  {
    id: "ddo_q13",
    optionA: "Наблюдать, изучать работу кружков художественной самодеятельности",
    optionB: "Наблюдать, изучать жизнь микробов",
    typeIfA: "human_artistic_image",
    typeIfB: "human_nature",
  },
  {
    id: "ddo_q14",
    optionA: "Обслуживать, налаживать медицинские приборы, аппараты",
    optionB: "Оказывать людям медицинскую помощь при ранениях, ушибах, ожогах и т.п.",
    typeIfA: "human_technique",
    typeIfB: "human_human",
  },
  {
    id: "ddo_q15",
    optionA: "Составлять точные описания-отчёты о наблюдаемых явлениях, событиях, измеряемых объектах и др.",
    optionB: "Художественно описывать, изображать события (наблюдаемые и представляемые)",
    typeIfA: "human_sign_system",
    typeIfB: "human_artistic_image",
  },
  {
    id: "ddo_q16",
    optionA: "Делать лабораторные анализы в больнице",
    optionB: "Принимать, осматривать больных, беседовать с ними, назначать лечение",
    typeIfA: "human_nature",
    typeIfB: "human_human",
  },
  {
    id: "ddo_q17",
    optionA: "Красить или расписывать стены помещений, поверхность изделий",
    optionB: "Осуществлять монтаж или сборку машин, приборов",
    typeIfA: "human_artistic_image",
    typeIfB: "human_technique",
  },
  {
    id: "ddo_q18",
    optionA: "Организовывать культпоходы сверстников или младших в театры, музеи, экскурсии, туристические походы и т.п.",
    optionB: "Играть на сцене, принимать участие в концертах",
    typeIfA: "human_human",
    typeIfB: "human_artistic_image",
  },
  {
    id: "ddo_q19",
    optionA: "Изготовлять по чертежам детали, изделия (машины, одежду), строить здания",
    optionB: "Заниматься черчением, копировать чертежи, карты",
    typeIfA: "human_technique",
    typeIfB: "human_sign_system",
  },
  {
    id: "ddo_q20",
    optionA: "Вести борьбу с болезнями растений, с вредителями леса, сада",
    optionB: "Работать на клавишных машинах (пишущей машинке, телетайпе, наборной машине и др.)",
    typeIfA: "human_nature",
    typeIfB: "human_sign_system",
  },
];

export const LUSCHER_COLORS: ReadonlyArray<LuscherColor> = [
  { id: 0, name: "Серый", hex: "#9E9E9E" },
  { id: 1, name: "Тёмно-синий", hex: "#1A237E" },
  { id: 2, name: "Сине-зелёный", hex: "#00897B" },
  { id: 3, name: "Оранжево-красный", hex: "#E65100" },
  { id: 4, name: "Жёлтый", hex: "#FBC02D" },
  { id: 5, name: "Фиолетовый", hex: "#6A1B9A" },
  { id: 6, name: "Коричневый", hex: "#795548" },
  { id: 7, name: "Чёрный", hex: "#212121" },
];

/** Идеальный ранг по аутогенной норме (цвет → ранг 1–8). */
export const LUSCHER_IDEAL_RANK_BY_COLOR_ID: Readonly<Record<number, number>> = {
  0: 7,
  1: 5,
  2: 3,
  3: 1,
  4: 2,
  5: 4,
  6: 6,
  7: 8,
};

export const ROSENZWEIG_SITUATIONS: ReadonlyArray<RosenzweigSituation> = [
  {
    id: "rz_q1",
    text: "Поставщик привозит продукты на 3 часа позже обещанного, перед самым открытием зала.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q2",
    text: "Ключевой сотрудник не вышел на смену без предупреждения в пятницу вечером.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q3",
    text: "Оборудование (плита, холодильник, касса) выходит из строя в разгар обеда.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q4",
    text: "Гость требует блюдо, которого нет в меню, и настаивает на немедленном решении.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q5",
    text: "Руководство в последний момент отменяет уже согласованный бюджет на ремонт точки.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q6",
    text: "Служба доставки систематически задерживает заказы, гости жалуются вам напрямую.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q7",
    text: "Управляющий соседней точки группы отказывается делиться персоналом в аврале.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q8",
    text: "Электричество отключается на точке в вечерний час пик.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q9",
    text: "Сотрудник, которого вы месяц обучали, увольняется без предупреждения.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q10",
    text: "Проверяющая инспекция приходит именно в самый загруженный день.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q11",
    text: "Часть заказанного алкоголя не довезли, а банкет гостя уже начался.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q12",
    text: "Касса и система бронирования зависают во время крупного мероприятия.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q13",
    text: "Гость, не дождавшись столика, уходит и оставляет резко негативный отзыв.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q14",
    text: "Су-шеф меняет позицию в меню, не согласовав с вами, и гости жалуются на вкус.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q15",
    text: "Клининговая компания не убирает зал вовремя перед важным мероприятием.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q16",
    text: "Соседний ресторан переманивает часть вашей команды более высокой зарплатой.",
    situationKind: "obstacle",
  },
  {
    id: "rz_q17",
    text: "Вышестоящий руководитель при всех обвиняет именно вас в падении выручки за квартал.",
    situationKind: "accusation",
  },
  {
    id: "rz_q18",
    text: "Гость в грубой форме лично обвиняет вас в том, что его заказ перепутали.",
    situationKind: "accusation",
  },
  {
    id: "rz_q19",
    text: "HR-директор говорит, что именно из-за вашего стиля управления в команде высокая текучесть.",
    situationKind: "accusation",
  },
  {
    id: "rz_q20",
    text: "Коллега-управляющий на общем собрании заявляет, что вы «подставили» его точку перед комиссией.",
    situationKind: "accusation",
  },
  {
    id: "rz_q21",
    text: "Шеф-повар при команде заявляет, что вы не разбираетесь в кухне и мешаете ему работать.",
    situationKind: "accusation",
  },
  {
    id: "rz_q22",
    text: "Финансовый директор обвиняет вас в перерасходе бюджета, хотя решение с ним согласовывалось.",
    situationKind: "accusation",
  },
  {
    id: "rz_q23",
    text: "Подчинённый жалуется вышестоящему руководству, что вы несправедливо его наказали.",
    situationKind: "accusation",
  },
  {
    id: "rz_q24",
    text: "Владелец компании один на один говорит, что разочарован именно в вас лично.",
    situationKind: "accusation",
  },
];

export type AttestationAnswers = Record<string, number | string | null>;

/**
 * Пустой объект ответов по всем пунктам аттестации.
 */
export function createEmptyAttestationAnswers(): AttestationAnswers {
  const answers: AttestationAnswers = {};
  for (const question of MINI_IPIP_QUESTIONS) {
    answers[question.id] = null;
  }
  for (const question of MANAGEMENT_POTENTIAL_QUESTIONS) {
    answers[question.id] = null;
  }
  for (const question of CBI_QUESTIONS) {
    answers[question.id] = null;
  }
  for (const question of SPIELBERGER_QUESTIONS) {
    answers[question.id] = null;
  }
  for (const question of KLIMOV_DDO_QUESTIONS) {
    answers[question.id] = null;
  }
  for (const color of LUSCHER_COLORS) {
    answers[luscherRankAnswerKey(color.id)] = null;
  }
  for (const situation of ROSENZWEIG_SITUATIONS) {
    answers[situation.id] = null;
  }
  return answers;
}

/**
 * Проверяет заполненность одного блока аттестации.
 */
export function isAttestationBlockComplete(
  blockId: AttestationBlockId,
  answers: AttestationAnswers
): boolean {
  switch (blockId) {
    case "mini_ipip":
      return _allLikertAnswered(answers, MINI_IPIP_QUESTIONS, 1, 5);
    case "management_potential":
      return _allLikertAnswered(answers, MANAGEMENT_POTENTIAL_QUESTIONS, 1, 5);
    case "cbi":
      return _allLikertAnswered(answers, CBI_QUESTIONS, 0, 4);
    case "spielberger":
      return _allLikertAnswered(answers, SPIELBERGER_QUESTIONS, 1, 4);
    case "klimov_ddo":
      return KLIMOV_DDO_QUESTIONS.every((question) => {
        const value = answers[question.id];
        return value === "a" || value === "b";
      });
    case "luscher":
      return _isLuscherComplete(answers);
    case "rosenzweig":
      return ROSENZWEIG_SITUATIONS.every((situation) => {
        const value = answers[situation.id];
        return typeof value === "string" && value.trim().length > 0;
      });
    default: {
      const _exhaustive: never = blockId;
      return _exhaustive;
    }
  }
}

/**
 * Проверяет, что все блоки аттестации заполнены.
 */
export function isAttestationComplete(answers: AttestationAnswers): boolean {
  const blockIds: ReadonlyArray<AttestationBlockId> = [
    "mini_ipip",
    "management_potential",
    "cbi",
    "spielberger",
    "klimov_ddo",
    "luscher",
    "rosenzweig",
  ];
  return blockIds.every((blockId) => isAttestationBlockComplete(blockId, answers));
}

function _allLikertAnswered(
  answers: AttestationAnswers,
  questions: ReadonlyArray<{ id: string }>,
  min: number,
  max: number
): boolean {
  return questions.every((question) => {
    const value = answers[question.id];
    return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
  });
}

function _isLuscherComplete(answers: AttestationAnswers): boolean {
  const ranks: number[] = [];
  for (const color of LUSCHER_COLORS) {
    const value = answers[luscherRankAnswerKey(color.id)];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 8) {
      return false;
    }
    ranks.push(value);
  }
  const unique = new Set(ranks);
  return unique.size === 8;
}

/** Число пунктов, по которым кандидат даёт ответ (для прогресса). */
export const ATTESTATION_ANSWERABLE_COUNT =
  MINI_IPIP_QUESTIONS.length +
  MANAGEMENT_POTENTIAL_QUESTIONS.length +
  CBI_QUESTIONS.length +
  SPIELBERGER_QUESTIONS.length +
  KLIMOV_DDO_QUESTIONS.length +
  LUSCHER_COLORS.length +
  ROSENZWEIG_SITUATIONS.length;

/**
 * Считает число заполненных пунктов аттестации (для индикатора прогресса).
 */
export function countAttestationAnswered(answers: AttestationAnswers): number {
  let count = 0;
  for (const question of MINI_IPIP_QUESTIONS) {
    if (_isLikertAnswered(answers[question.id], 1, 5)) count += 1;
  }
  for (const question of MANAGEMENT_POTENTIAL_QUESTIONS) {
    if (_isLikertAnswered(answers[question.id], 1, 5)) count += 1;
  }
  for (const question of CBI_QUESTIONS) {
    if (_isLikertAnswered(answers[question.id], 0, 4)) count += 1;
  }
  for (const question of SPIELBERGER_QUESTIONS) {
    if (_isLikertAnswered(answers[question.id], 1, 4)) count += 1;
  }
  for (const question of KLIMOV_DDO_QUESTIONS) {
    const value = answers[question.id];
    if (value === "a" || value === "b") count += 1;
  }
  if (_isLuscherComplete(answers)) {
    count += LUSCHER_COLORS.length;
  }
  for (const situation of ROSENZWEIG_SITUATIONS) {
    const value = answers[situation.id];
    if (typeof value === "string" && value.trim().length > 0) count += 1;
  }
  return count;
}

/**
 * Индекс первого незавершённого блока (0–6); если все заполнены — последний блок.
 */
export function findFirstIncompleteAttestationBlockIndex(answers: AttestationAnswers): number {
  const blockIds: ReadonlyArray<AttestationBlockId> = [
    "mini_ipip",
    "management_potential",
    "cbi",
    "spielberger",
    "klimov_ddo",
    "luscher",
    "rosenzweig",
  ];
  for (let index = 0; index < blockIds.length; index += 1) {
    if (!isAttestationBlockComplete(blockIds[index], answers)) {
      return index;
    }
  }
  return blockIds.length - 1;
}

function _isLikertAnswered(value: number | string | null | undefined, min: number, max: number): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
