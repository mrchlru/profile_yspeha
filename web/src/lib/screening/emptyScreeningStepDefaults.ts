import { createEmptyGerchikovStep2Data } from "@/lib/gerchikov/step2Types";
import { createEmptyKotStep1Data } from "@/lib/kot/step1Types";
import { createEmptyStep4Data } from "@/lib/step4/step4Types";
import type { Step1Data, Step2Data, Step3Data, Step4Data } from "@/store/useFormStore";

const EMPTY_STEP3: Step3Data = {
  q1: null,
  q2: null,
  q3: null,
  q4: null,
  q5: null,
  q6: null,
  q7: null,
  q8: null,
  q9: null,
  q10: null,
};

/** Пустые данные шагов скрининга для первичного upsert. */
export function emptyScreeningStepDefaults(): {
  step1Data: Step1Data;
  step2Data: Step2Data;
  step3Data: Step3Data;
  step4Data: Step4Data;
} {
  return {
    step1Data: createEmptyKotStep1Data(),
    step2Data: createEmptyGerchikovStep2Data(),
    step3Data: { ...EMPTY_STEP3 },
    step4Data: createEmptyStep4Data(),
  };
}
