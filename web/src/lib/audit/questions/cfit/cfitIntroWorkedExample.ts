/**

 * Учебный пример на экране инструкции перед каждым блоком CFIT.

 *

 * Если для субтеста есть `example-02.jpg` из Word-документа заказчика —

 * показываем его с ответом из прил. II PDF (строка «Пример 2»).

 * Иначе — второе задание субтеста и ключ для задания № 2.

 */



import type { AuditCfitChoiceDigit } from "@/lib/audit/questions/cfit/cfitSubtestItems";

import {

  AUDIT_CFIT_ITEMS_BY_SUBTEST,

  type AuditCfitChoiceSrcs,

  type AuditCfitSubtestInternalKey,

} from "@/lib/audit/questions/cfit/cfitSubtestItems";

import { CFIT_ANSWER_KEYS } from "@/lib/audit/report/keys/auditScoringKeys";



export type AuditCfitIntroWorkedExample = {

  readonly stimulusSrc: string | null;

  readonly choiceSrcs: AuditCfitChoiceSrcs;

  /** Вариант, подсвечиваемый как верный в учебном примере. */

  readonly solutionDigit: AuditCfitChoiceDigit;

};



/**

 * Примеры из Word + ответ «Пример 2» по прил. II PDF.

 * Добавляется по мере загрузки docx заказчиком.

 */

const CFIT_DOCX_INTRO_EXAMPLE: Readonly<

  Partial<

    Record<

      AuditCfitSubtestInternalKey,

      { readonly stimulusSrc: string; readonly solutionDigit: AuditCfitChoiceDigit }

    >

  >

> = {

  cfit_subtest_1: {
    stimulusSrc: "/audit/cfit/sub01/example-02.jpg",
    solutionDigit: "3",
  },
  cfit_subtest_2: {
    stimulusSrc: "/audit/cfit/sub02/example-02.jpg",
    solutionDigit: "1",
  },
  /** В docx только «Пример 1»; ответ по прил. II PDF. */
  cfit_subtest_3: {
    stimulusSrc: "/audit/cfit/sub03/example-01.jpg",
    solutionDigit: "3",
  },
  cfit_subtest_4: {
    stimulusSrc: "/audit/cfit/sub05/example-01.jpg",
    solutionDigit: "3",
  },
  cfit_subtest_5: {
    stimulusSrc: "/audit/cfit/sub07/example-02.jpg",
    solutionDigit: "5",
  },
  cfit_subtest_6: {
    stimulusSrc: "/audit/cfit/sub04/example-02.jpg",
    solutionDigit: "3",
  },
  cfit_subtest_7: {
    stimulusSrc: "/audit/cfit/sub08/example-02.jpg",
    solutionDigit: "4",
  },
  cfit_subtest_8: {
    stimulusSrc: "/audit/cfit/sub06/example-02.jpg",
    solutionDigit: "2",
  },
};



function _subtestIndex(key: AuditCfitSubtestInternalKey): number {

  return Number(key.replace("cfit_subtest_", "")) - 1;

}



/** Возвращает данные для одного блока «пример решения» на интро CFIT. */

export function getAuditCfitIntroWorkedExample(

  subtest: AuditCfitSubtestInternalKey

): AuditCfitIntroWorkedExample {

  const fromDocx = CFIT_DOCX_INTRO_EXAMPLE[subtest];

  if (fromDocx !== undefined) {

    return {

      stimulusSrc: fromDocx.stimulusSrc,

      choiceSrcs: {},

      solutionDigit: fromDocx.solutionDigit,

    };

  }



  const items = AUDIT_CFIT_ITEMS_BY_SUBTEST[subtest];

  const demo = items[1] ?? items[0];

  if (demo === undefined) {

    throw new Error(`CFIT subtest ${subtest} has no items`);

  }

  const key = CFIT_ANSWER_KEYS[_subtestIndex(subtest)] ?? [];

  const solutionDigit = key[1] ?? key[0] ?? "3";

  return {

    stimulusSrc: demo.stimulusSrc,

    choiceSrcs: demo.choiceSrcs,

    solutionDigit,

  };

}


