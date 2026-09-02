"use client";



import React, { useState } from "react";

import {

  questionCardSurfaceClass,

  stepQuestionTitleClass,

} from "@/lib/stepPageTheme";

import type {

  AuditCfitChoiceDigit,

  AuditCfitItem,

} from "@/lib/audit/questions/cfit/cfitSubtestItems";

import { AUDIT_CFIT_CHOICE_DIGITS } from "@/lib/audit/questions/cfit/cfitSubtestItems";



export type AuditCfitAnswer = AuditCfitChoiceDigit | null;



export type AuditCfitStimulusSize = "default" | "compact";



/** Как пояснять задание в подписи под номером пункта (разные форматы экранов Fisom). */

export type AuditCfitPromptKind =

  | "stem_plus_choices"

  /** Пять квадратиков в ряд — найти фигуру, не подходящую к четырём остальным. */

  | "classification_five"

  /** Дополнить общий рисунок: пустой квадрат слева, пять вариантов справа. */
  | "complete_drawing"
  /** Серия: три фигуры слева + пять вариантов справа. */
  | "series_completion";

export type AuditCfitListProps = {

  /** Все задания текущего субтеста. */

  items: ReadonlyArray<AuditCfitItem>;

  /** Ответы `q1`…`qN` → `1`…`5` или `null`. */

  answers: Readonly<Record<string, AuditCfitAnswer>>;

  onAnswer: (questionId: string, value: AuditCfitChoiceDigit) => void;

  /** Размер картинки-стимула. Для компактного отображения у мобильных экранов. */

  stimulusSize?: AuditCfitStimulusSize;

  /** Подсказка под номером вопроса (CFIT 3 и 4 без отдельного стимула). */

  promptKind?: AuditCfitPromptKind;

};



const _CHOICES: ReadonlyArray<{ readonly id: AuditCfitChoiceDigit; readonly label: string }> =

  AUDIT_CFIT_CHOICE_DIGITS.map((id) => ({ id, label: id }));



/**

 * Графические задания CFIT: стимул (при наличии) сверху и пять кнопок-вариантов 1–5

 * с картинками (если есть отдельные файлы).

 */

export function AuditCfitList({

  items,

  answers,

  onAnswer,

  stimulusSize = "default",

  promptKind = "stem_plus_choices",

}: AuditCfitListProps): React.ReactElement {

  return (

    <ol className="space-y-3" type="1">

      {items.map((item) => {

        const questionId = `q${String(item.index)}`;

        const current = answers[questionId] ?? null;

        const hasStimulus =

          item.stimulusSrc !== null && item.stimulusSrc.length > 0;

        const displayNum = item.index;

        const promptLine = _cfitPromptLine(promptKind);

        return (

          <li

            key={questionId}

            className={`${questionCardSurfaceClass} px-5 py-4 sm:px-6 sm:py-5`}

          >

            <p className={`${stepQuestionTitleClass} mb-3`}>

              <span className="mr-2 text-[#00B596]">{`${String(displayNum)}.`}</span>

              <span className="text-[#5F5E5E]">{promptLine}</span>

            </p>

            {hasStimulus ? (

              <div className="mb-4 overflow-x-auto rounded-2xl border border-black/10 bg-white/90 p-3">

                <CfitFigure

                  src={item.stimulusSrc as string}

                  alt={`Задание ${String(item.index)}, условие`}

                  variant="stimulus"

                  stimulusSize={stimulusSize}

                />

              </div>

            ) : null}

            <div className="flex flex-wrap justify-center gap-3">

              {_CHOICES.map((choice) => (

                <CfitChoiceCell

                  key={choice.id}

                  label={choice.label}

                  imageSrc={item.choiceSrcs[choice.id]}

                  isActive={current === choice.id}

                  onClick={() => onAnswer(questionId, choice.id)}

                />

              ))}

            </div>

          </li>

        );

      })}

    </ol>

  );

}



function _cfitPromptLine(kind: AuditCfitPromptKind): string {

  switch (kind) {

    case "classification_five":

      return "Одно задание — пять фигур в ряд. Выберите цифру той фигуры, которая не подходит к четырём остальным.";

    case "complete_drawing":
      return "Выберите цифру того квадратика справа, который лучше всего подходит на место пустого квадратика слева.";
    case "series_completion":
      return "Выберите цифру (1–5) того варианта справа, который лучше всего продолжает ряд слева.";
    default:

      return "Выберите один вариант (1–5) — тот, который, по-вашему, правильно дополняет задачу.";

  }

}



type CfitFigureProps = {

  src: string;

  alt: string;

  variant: "stimulus" | "choice";

  stimulusSize?: AuditCfitStimulusSize;

};



function CfitFigure(props: CfitFigureProps): React.ReactElement {

  const [broken, setBroken] = useState(false);

  if (broken) {

    return (

      <div className="flex min-h-[80px] items-center justify-center px-4 py-6 text-center text-[14px] text-[#5F5E5E]">

        Не удалось загрузить рисунок.

      </div>

    );

  }

  const compactStimulus =

    "mx-auto h-auto max-h-[min(38vh,260px)] w-full max-w-xl object-contain sm:max-h-[min(42vh,300px)] sm:max-w-2xl";

  const defaultStimulus =

    "mx-auto h-auto max-h-[min(72vh,480px)] w-full max-w-3xl object-contain";

  const sizeCls =

    props.variant === "stimulus"

      ? props.stimulusSize === "compact"

        ? compactStimulus

        : defaultStimulus

      : "mx-auto h-auto max-h-[140px] w-full max-w-[160px] object-contain";

  return (

    // eslint-disable-next-line @next/next/no-img-element -- статика из public

    <img

      src={props.src}

      alt={props.alt}

      className={sizeCls}

      onError={() => setBroken(true)}

    />

  );

}



function CfitChoiceCell(props: {

  label: string;

  imageSrc: string | undefined;

  isActive: boolean;

  onClick: () => void;

}): React.ReactElement {

  const base =

    "flex min-w-[100px] max-w-[200px] flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center transition focus:outline-none focus:ring-2 focus:ring-[#00B596]/35 sm:min-w-[112px]";

  const activeCls =

    "border-[#00B596] bg-[#00B596]/12 shadow-[0px_4px_18px_0px_rgba(0,181,150,0.25)]";

  const inactiveCls = "border-black/10 bg-white/85 hover:bg-white";

  return (

    <button

      type="button"

      onClick={props.onClick}

      className={`${base} ${props.isActive ? activeCls : inactiveCls}`}

    >

      <span

        className={`text-[15px] font-extrabold ${props.isActive ? "text-[#00B596]" : "text-[#5F5E5E]"}`}

      >

        {props.label}

      </span>

      {props.imageSrc !== undefined && props.imageSrc.length > 0 ? (

        <div className="w-full rounded-xl bg-white/90 p-1">

          <CfitFigure

            src={props.imageSrc}

            alt={`Вариант ${props.label}`}

            variant="choice"

          />

        </div>

      ) : null}

    </button>

  );

}

