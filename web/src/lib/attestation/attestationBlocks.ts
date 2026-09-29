/** Идентификатор блока аттестации (порядок прохождения). */
export type AttestationBlockId =
  | "mini_ipip"
  | "management_potential"
  | "cbi"
  | "spielberger"
  | "klimov_ddo"
  | "luscher"
  | "rosenzweig";

export type AttestationBlock = {
  id: AttestationBlockId;
  /** Заголовок для кандидата без названия методики. */
  candidateTitle: string;
  /** Нейтральная инструкция перед блоком. */
  instruction: string;
};

/** Блоки аттестации в порядке прохождения (7 из 7). */
export const ATTESTATION_BLOCKS: ReadonlyArray<AttestationBlock> = [
  {
    id: "mini_ipip",
    candidateTitle: "Блок 1 из 7",
    instruction:
      "Оцените, насколько каждое утверждение описывает вас. Выберите ответ по шкале от «совершенно неточно» до «совершенно точно».",
  },
  {
    id: "management_potential",
    candidateTitle: "Блок 2 из 7",
    instruction:
      "Оцените, насколько вы согласны с каждым утверждением о вашем рабочем поведении. Шкала от «совершенно не согласен» до «полностью согласен».",
  },
  {
    id: "cbi",
    candidateTitle: "Блок 3 из 7",
    instruction:
      "Ответьте, как часто у вас возникают перечисленные ощущения или ситуации. Выберите один из пяти вариантов частоты.",
  },
  {
    id: "spielberger",
    candidateTitle: "Блок 4 из 7",
    instruction:
      "Первые утверждения относятся к тому, как вы себя чувствуете сейчас; следующие — к тому, как вы обычно себя ведёте. Оцените каждое утверждение по шкале от «нет, это не так» до «совершенно верно».",
  },
  {
    id: "klimov_ddo",
    candidateTitle: "Блок 5 из 7",
    instruction:
      "В каждой паре выберите один вариант деятельности, который вам интереснее. Правильных и неправильных ответов нет.",
  },
  {
    id: "luscher",
    candidateTitle: "Блок 6 из 7",
    instruction:
      "Расставьте восемь цветов по степени приятности для вас сейчас: от 1 (самый приятный) до 8 (самый неприятный). Каждый ранг используйте один раз.",
  },
  {
    id: "rosenzweig",
    candidateTitle: "Блок 7 из 7",
    instruction:
      "Представьте каждую ситуацию и опишите своими словами, что бы вы сказали или сделали на месте управляющего.",
  },
];

export const ATTESTATION_BLOCK_COUNT = ATTESTATION_BLOCKS.length;

/**
 * Возвращает описание блока по идентификатору.
 */
export function getAttestationBlock(blockId: AttestationBlockId): AttestationBlock | undefined {
  return ATTESTATION_BLOCKS.find((block) => block.id === blockId);
}
