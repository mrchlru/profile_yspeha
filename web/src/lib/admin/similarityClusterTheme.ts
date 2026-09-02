/** Пастельные цвета карточек — высокий риск (≥65%). */

export const SIMILARITY_CLUSTER_CARD_CLASSES: readonly string[] = [

  "rounded-[28px] bg-[#FFE8E8] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] ring-2 ring-[#F0BCBC]",

  "rounded-[28px] bg-[#E8F2FF] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] ring-2 ring-[#BCD0F0]",

  "rounded-[28px] bg-[#E8F8EA] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] ring-2 ring-[#BCE8C0]",

  "rounded-[28px] bg-[#FFF3E0] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] ring-2 ring-[#F0D4A8]",

  "rounded-[28px] bg-[#F0E8FF] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] ring-2 ring-[#D0BCF0]",

  "rounded-[28px] bg-[#E8FFF8] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] ring-2 ring-[#BCE8DC]",

  "rounded-[28px] bg-[#FFF0F5] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] ring-2 ring-[#F0BCD0]",

  "rounded-[28px] bg-[#F5F0E8] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] ring-2 ring-[#E0D0BC]",

];



const SOFT_SEVERITY_CARD_CLASS =

  "rounded-[28px] bg-[#FFF8E0] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] ring-2 ring-[#F0D890]";



const CLOSE_IN_TIME_RING = "ring-[#E08080]";



/** Класс карточки папки по индексу кластера или стандартный серый. */

export function similarityFolderCardClass(

  colorIndex: number | null | undefined,

  severity?: "high" | "soft" | null,

  hasCloseInTimeMatch?: boolean

): string {

  if (colorIndex === null || colorIndex === undefined) {

    return "rounded-[28px] bg-[#DDDDDD] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)]";

  }

  if (severity === "soft") {

    return hasCloseInTimeMatch

      ? `${SOFT_SEVERITY_CARD_CLASS} ${CLOSE_IN_TIME_RING}`

      : SOFT_SEVERITY_CARD_CLASS;

  }

  const len = SIMILARITY_CLUSTER_CARD_CLASSES.length;

  const idx = ((colorIndex % len) + len) % len;

  const base = SIMILARITY_CLUSTER_CARD_CLASSES[idx] ?? SIMILARITY_CLUSTER_CARD_CLASSES[0]!;

  return hasCloseInTimeMatch ? `${base} ${CLOSE_IN_TIME_RING}` : base;

}


