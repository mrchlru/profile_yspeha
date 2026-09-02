/** Веса методик risk engine для батареи ОД / руководителей / резерва (12 методик). */
export const OD_RESERVE_METHODOLOGY_WEIGHTS: Record<string, number> = {
  burnout: 10,
  maslachMbi: 10,
  communication: 9,
  motivation: 9,
  locusOfControl: 8,
  adaptability: 8,
  goalPursuit: 7,
  conflictStyle: 7,
  stressType: 6,
  riskReadiness: 5,
  decisionStyle: 5,
  cfit: 3,
};
