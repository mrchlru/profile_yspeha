"use client";

import React, { useCallback } from "react";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import {
  AuditQuestionsLayout,
} from "@/components/audit/AuditQuestionsLayout";
import { AuditYesNoList, type AuditYesNoAnswer } from "@/components/audit/AuditYesNoList";
import {
  AuditYesNoUnknownList,
  type AuditYesNoUnknownAnswer,
} from "@/components/audit/AuditYesNoUnknownList";
import { AuditMcqList } from "@/components/audit/AuditMcqList";
import { AuditLikert4List } from "@/components/audit/AuditLikert4List";
import {
  AuditLikert5List,
  type AuditLikert5OptionId,
} from "@/components/audit/AuditLikert5List";
import {
  AuditLikert7List,
  type AuditLikert7OptionId,
} from "@/components/audit/AuditLikert7List";
import {
  AuditTrueFalseList,
  type AuditTrueFalseAnswer,
} from "@/components/audit/AuditTrueFalseList";
import {
  AuditPairsList,
  type AuditPairAnswer,
} from "@/components/audit/AuditPairsList";
import { AuditStepStubBody } from "@/components/audit/AuditStepStubBody";
import {
  getStepAnsweredCount,
  type AuditStepAnswers,
} from "@/lib/audit/auditAnswers";
import type { AuditStepConfig } from "@/lib/audit/auditTypes";
import { AUDIT_STEP_07_QUESTIONS } from "@/lib/audit/questions/step07YesNo";
import { AUDIT_STEP_23_QUESTIONS } from "@/lib/audit/questions/step23YesNo";
import {
  AUDIT_STEP_02_QUESTIONS,
  type AuditStep02Answer,
} from "@/lib/audit/questions/step02Mcq";
import { AUDIT_STEP_06_QUESTIONS } from "@/lib/audit/questions/step06YesNoUnknown";
import {
  AUDIT_STEP_03_OPTIONS,
  AUDIT_STEP_03_QUESTIONS,
  type AuditStep03Answer,
} from "@/lib/audit/questions/step03Likert4";
import { AUDIT_STEP_04_QUESTIONS } from "@/lib/audit/questions/step04TrueFalse";
import {
  AUDIT_STEP_05_OPTIONS,
  AUDIT_STEP_05_QUESTIONS,
} from "@/lib/audit/questions/step05Likert5";
import {
  AUDIT_STEP_09_OPTIONS,
  AUDIT_STEP_09_QUESTIONS,
} from "@/lib/audit/questions/step09Likert7";
import { AUDIT_STEP_08_PAIRS } from "@/lib/audit/questions/step08Pairs";
import { AUDIT_STEP_01_PAIRS } from "@/lib/audit/questions/step01Pairs";
import { AUDIT_STEP_18_PAIRS } from "@/lib/audit/questions/step18KeirseyPairs";
import { AUDIT_STEP_20_PAIRS } from "@/lib/audit/questions/step20Pairs";
import {
  AUDIT_STEP_19_ITEMS,
  AUDIT_STEP_19_OPTIONS,
  type AuditStep19FrequencyId,
} from "@/lib/audit/questions/step19Maslach";
import { MaslachBurnoutLikertList } from "@/components/burnout/MaslachBurnoutLikertList";
import {
  coerceMaslachBurnoutAnswer,
  MASLACH_BURNOUT_OPTIONS,
  MASLACH_BURNOUT_QUESTIONS,
  MASLACH_BURNOUT_QUESTION_COUNT,
  type MaslachBurnoutOptionId,
} from "@/lib/burnout/maslachBurnoutQuestions";
import {
  AUDIT_STEP_21_QUESTIONS,
  countAuditStep21Answered,
} from "@/lib/audit/questions/step21Gerchikov";
import {
  AuditGerchikovList,
  type AuditGerchikovAnswers,
} from "@/components/audit/AuditGerchikovList";
import {
  AUDIT_STEP_22_OPTIONS,
  AUDIT_STEP_22_QUESTIONS,
} from "@/lib/audit/questions/step22Likert11";
import {
  AuditLikert11List,
  type AuditLikert11OptionId,
} from "@/components/audit/AuditLikert11List";
import {
  AUDIT_STEP_26_QUESTIONS,
  type AuditStep26Answer,
} from "@/lib/audit/questions/step26Sectarianism";
import {
  AUDIT_STEP_24_QUESTIONS,
  getNextUnansweredStep24Index,
} from "@/lib/audit/questions/step24Erudition";
import { AuditEruditionPool } from "@/components/audit/AuditEruditionPool";
import {
  AUDIT_CFIT_ITEMS_BY_SUBTEST,
  type AuditCfitChoiceDigit,
  normalizeAuditCfitChoice,
  type AuditCfitItem,
  type AuditCfitSubtestInternalKey,
} from "@/lib/audit/questions/cfit/cfitSubtestItems";
import {
  AuditCfitList,
  type AuditCfitAnswer,
  type AuditCfitPromptKind,
} from "@/components/audit/AuditCfitList";

export type AuditStepQuestionsRouterProps = {
  step: AuditStepConfig;
  /** Номер шага для UI («Шаг N из M»): позиция в батарее, не внутренний `step.stepIndex`. */
  displayStepIndex: number;
  totalSteps: number;
  onComplete: () => void;
  /**
   * Контент, отображаемый в правой части шапки шага (обычно — `AuditTimerBadge`
   * от `AuditStepTimerHost`). Прокидывается в `rightSlot` базового layout'а.
   */
  rightSlot?: React.ReactNode;
};

/**
 * Маршрутизатор содержимого вопросов шага. Каждый шаг с реализованным UI
 * обрабатывается отдельной веткой по `step.internalKey`. Для нереализованных
 * шагов отрисовывается прежняя заглушка `AuditStepStubBody`, чтобы тестирование
 * всего флоу аудита оставалось возможным.
 *
 * По мере подключения новых тестов сюда добавляются новые ветки (по одной за PR).
 */
export function AuditStepQuestionsRouter({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const sharedProps = { step, displayStepIndex, totalSteps, onComplete, rightSlot };
  switch (step.internalKey) {
    case "rowe_decision_styles":
      return <Step01PairsBody {...sharedProps} />;
    case "goal_pursuit_short":
      return <Step02McqBody {...sharedProps} />;
    case "paperwork_style_short":
      return <Step03Likert4Body {...sharedProps} />;
    case "snyder_self_monitoring":
      return <Step04TrueFalseBody {...sharedProps} />;
    case "schubert_risk_full":
      return <Step05Likert5Body {...sharedProps} />;
    case "tolerance_likert7_33":
      return <Step09Likert7Body {...sharedProps} />;
    case "cfit_subtest_1":
    case "cfit_subtest_2":
    case "cfit_subtest_3":
    case "cfit_subtest_4":
    case "cfit_subtest_5":
    case "cfit_subtest_6":
    case "cfit_subtest_7":
    case "cfit_subtest_8":
      return (
        <StepCfitBody
          {...sharedProps}
          items={
            AUDIT_CFIT_ITEMS_BY_SUBTEST[step.internalKey as AuditCfitSubtestInternalKey]
          }
        />
      );
    case "rotter_locus":
      return <Step08PairsBody {...sharedProps} />;
    case "keirsey_temperament":
      return <Step18KeirseyPairsBody {...sharedProps} />;
    case "maslach_burnout":
      return <Step19MaslachBody {...sharedProps} />;
    case "thomas_kilmann_conflict":
      return <Step20PairsBody {...sharedProps} />;
    case "gerchikov_motivation_full":
      return <Step21GerchikovBody {...sharedProps} />;
    case "pochebut_loyalty":
      return <Step22Likert11Body {...sharedProps} />;
    case "kos_communicative_organizational":
      return <Step23YesNoBody {...sharedProps} />;
    case "general_erudition_pool":
      return <Step24EruditionBody {...sharedProps} />;
    case "maslach_mbi_short":
      return <Step25MaslachMbiBody {...sharedProps} />;
    case "sectarianism_screening":
      return <Step26SectarianismBody {...sharedProps} />;
    case "type_a_jenkins_short":
      return <Step06YesNoUnknownBody {...sharedProps} />;
    case "strelyau_temperament_short":
      return <Step07YesNoBody {...sharedProps} />;
    default:
      return <AuditStepStubBody {...sharedProps} />;
  }
}

function Step03Likert4Body({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: string) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, string | null> = {};
  for (const question of AUDIT_STEP_03_QUESTIONS) {
    const key = `q${String(question.index)}`;
    const raw = answersForStep[key];
    const value: AuditStep03Answer = _coerceStep03Answer(raw);
    visibleAnswers[key] = value;
  }

  const total = AUDIT_STEP_03_QUESTIONS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditLikert4List
        questions={AUDIT_STEP_03_QUESTIONS}
        options={AUDIT_STEP_03_OPTIONS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function _coerceStep03Answer(raw: unknown): AuditStep03Answer {
  if (raw === "a" || raw === "b" || raw === "v" || raw === "g") {
    return raw;
  }
  return null;
}

function Step01PairsBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditPairAnswer) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, AuditPairAnswer> = {};
  for (const pair of AUDIT_STEP_01_PAIRS) {
    const key = `q${String(pair.index)}`;
    const value = answersForStep[key];
    visibleAnswers[key] = value === "a" || value === "b" ? value : null;
  }

  const total = AUDIT_STEP_01_PAIRS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditPairsList
        pairs={AUDIT_STEP_01_PAIRS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function Step18KeirseyPairsBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditPairAnswer) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, AuditPairAnswer> = {};
  for (const pair of AUDIT_STEP_18_PAIRS) {
    const key = `q${String(pair.index)}`;
    const value = answersForStep[key];
    visibleAnswers[key] = value === "a" || value === "b" ? value : null;
  }

  const total = AUDIT_STEP_18_PAIRS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditPairsList
        pairs={AUDIT_STEP_18_PAIRS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function Step19MaslachBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: string) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, AuditStep19FrequencyId | null> = {};
  for (const item of AUDIT_STEP_19_ITEMS) {
    const key = `q${String(item.index)}`;
    visibleAnswers[key] = _coerceStep19Answer(answersForStep[key]);
  }

  const total = AUDIT_STEP_19_ITEMS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditLikert4List
        questions={AUDIT_STEP_19_ITEMS}
        options={AUDIT_STEP_19_OPTIONS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function _coerceStep19Answer(raw: unknown): AuditStep19FrequencyId | null {
  if (raw === "never" || raw === "rare" || raw === "often" || raw === "usually") {
    return raw;
  }
  return null;
}

function Step25MaslachMbiBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: MaslachBurnoutOptionId) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, MaslachBurnoutOptionId | null> = {};
  for (const question of MASLACH_BURNOUT_QUESTIONS) {
    const key = `q${String(question.index)}`;
    visibleAnswers[key] = coerceMaslachBurnoutAnswer(answersForStep[key]);
  }

  const total = MASLACH_BURNOUT_QUESTION_COUNT;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <MaslachBurnoutLikertList
        questions={MASLACH_BURNOUT_QUESTIONS}
        options={MASLACH_BURNOUT_OPTIONS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function Step20PairsBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditPairAnswer) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, AuditPairAnswer> = {};
  for (const pair of AUDIT_STEP_20_PAIRS) {
    const key = `q${String(pair.index)}`;
    const value = answersForStep[key];
    visibleAnswers[key] = value === "a" || value === "b" ? value : null;
  }

  const total = AUDIT_STEP_20_PAIRS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditPairsList
        pairs={AUDIT_STEP_20_PAIRS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function Step08PairsBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditPairAnswer) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, AuditPairAnswer> = {};
  for (const pair of AUDIT_STEP_08_PAIRS) {
    const key = `q${String(pair.index)}`;
    const value = answersForStep[key];
    visibleAnswers[key] = value === "a" || value === "b" ? value : null;
  }

  const total = AUDIT_STEP_08_PAIRS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditPairsList
        pairs={AUDIT_STEP_08_PAIRS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function Step09Likert7Body({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditLikert7OptionId) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, AuditLikert7OptionId | null> = {};
  for (const question of AUDIT_STEP_09_QUESTIONS) {
    const key = `q${String(question.index)}`;
    visibleAnswers[key] = _coerceStep09Answer(answersForStep[key]);
  }

  const total = AUDIT_STEP_09_QUESTIONS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditLikert7List
        questions={AUDIT_STEP_09_QUESTIONS}
        options={AUDIT_STEP_09_OPTIONS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function _coerceStep09Answer(raw: unknown): AuditLikert7OptionId | null {
  if (
    raw === 1 ||
    raw === 2 ||
    raw === 3 ||
    raw === 4 ||
    raw === 5 ||
    raw === 6 ||
    raw === 7
  ) {
    return raw;
  }
  return null;
}

function Step05Likert5Body({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditLikert5OptionId) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, AuditLikert5OptionId | null> = {};
  for (const question of AUDIT_STEP_05_QUESTIONS) {
    const key = `q${String(question.index)}`;
    visibleAnswers[key] = _coerceStep05Answer(answersForStep[key]);
  }

  const total = AUDIT_STEP_05_QUESTIONS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditLikert5List
        questions={AUDIT_STEP_05_QUESTIONS}
        options={AUDIT_STEP_05_OPTIONS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function _coerceStep05Answer(raw: unknown): AuditLikert5OptionId | null {
  if (raw === -2 || raw === -1 || raw === 0 || raw === 1 || raw === 2) {
    return raw;
  }
  return null;
}

function Step04TrueFalseBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditTrueFalseAnswer) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const trueFalseAnswers: Record<string, AuditTrueFalseAnswer> = {};
  for (const question of AUDIT_STEP_04_QUESTIONS) {
    const key = `q${String(question.index)}`;
    const value = answersForStep[key];
    trueFalseAnswers[key] = value === "true" || value === "false" ? value : null;
  }

  const total = AUDIT_STEP_04_QUESTIONS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditTrueFalseList
        questions={AUDIT_STEP_04_QUESTIONS}
        answers={trueFalseAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function Step06YesNoUnknownBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditYesNoUnknownAnswer) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, AuditYesNoUnknownAnswer> = {};
  for (const question of AUDIT_STEP_06_QUESTIONS) {
    const key = `q${String(question.index)}`;
    const value = answersForStep[key];
    visibleAnswers[key] =
      value === "yes" || value === "no" || value === "unknown" ? value : null;
  }

  const total = AUDIT_STEP_06_QUESTIONS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditYesNoUnknownList
        questions={AUDIT_STEP_06_QUESTIONS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function Step02McqBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: string) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const mcqAnswers: Record<string, string | null> = {};
  for (const question of AUDIT_STEP_02_QUESTIONS) {
    const key = `q${String(question.index)}`;
    const raw = answersForStep[key];
    const value: AuditStep02Answer = _coerceStep02Answer(raw);
    mcqAnswers[key] = value;
  }

  const total = AUDIT_STEP_02_QUESTIONS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditMcqList
        questions={AUDIT_STEP_02_QUESTIONS}
        answers={mcqAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function _coerceStep02Answer(raw: unknown): AuditStep02Answer {
  if (raw === "a" || raw === "b" || raw === "v") {
    return raw;
  }
  return null;
}

function Step26SectarianismBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: string) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const mcqAnswers: Record<string, string | null> = {};
  for (const question of AUDIT_STEP_26_QUESTIONS) {
    const key = `q${String(question.index)}`;
    const raw = answersForStep[key];
    const value: AuditStep26Answer = _coerceStep26Answer(raw);
    mcqAnswers[key] = value;
  }

  const total = AUDIT_STEP_26_QUESTIONS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditMcqList
        questions={AUDIT_STEP_26_QUESTIONS}
        answers={mcqAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function _coerceStep26Answer(raw: unknown): AuditStep26Answer {
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  return null;
}

function Step07YesNoBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditYesNoAnswer) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const yesNoAnswers: Record<string, AuditYesNoAnswer> = {};
  for (const question of AUDIT_STEP_07_QUESTIONS) {
    const key = `q${String(question.index)}`;
    const value = answersForStep[key];
    yesNoAnswers[key] = value === "yes" || value === "no" ? value : null;
  }

  const total = AUDIT_STEP_07_QUESTIONS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditYesNoList
        questions={AUDIT_STEP_07_QUESTIONS}
        answers={yesNoAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function Step23YesNoBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditYesNoAnswer) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const yesNoAnswers: Record<string, AuditYesNoAnswer> = {};
  for (const question of AUDIT_STEP_23_QUESTIONS) {
    const key = `q${String(question.index)}`;
    const value = answersForStep[key];
    yesNoAnswers[key] = value === "yes" || value === "no" ? value : null;
  }

  const total = AUDIT_STEP_23_QUESTIONS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditYesNoList
        questions={AUDIT_STEP_23_QUESTIONS}
        answers={yesNoAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function Step22Likert11Body({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditLikert11OptionId) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, AuditLikert11OptionId | null> = {};
  for (const question of AUDIT_STEP_22_QUESTIONS) {
    const key = `q${String(question.index)}`;
    visibleAnswers[key] = _coerceStep22Answer(answersForStep[key]);
  }

  const total = AUDIT_STEP_22_QUESTIONS.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditLikert11List
        questions={AUDIT_STEP_22_QUESTIONS}
        options={AUDIT_STEP_22_OPTIONS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function _coerceStep22Answer(raw: unknown): AuditLikert11OptionId | null {
  if (
    raw === 1 || raw === 2 || raw === 3 || raw === 4 || raw === 5 || raw === 6 ||
    raw === 7 || raw === 8 || raw === 9 || raw === 10 || raw === 11
  ) {
    return raw;
  }
  return null;
}

function Step21GerchikovBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: string | ReadonlyArray<string>) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: AuditGerchikovAnswers = {};
  const visibleAnswersAcc: Record<
    string,
    string | ReadonlyArray<string> | null
  > = {};
  for (const question of AUDIT_STEP_21_QUESTIONS) {
    const raw = answersForStep[question.id];
    if (typeof raw === "string") {
      visibleAnswersAcc[question.id] = raw;
    } else if (Array.isArray(raw)) {
      visibleAnswersAcc[question.id] = raw as ReadonlyArray<string>;
    } else {
      visibleAnswersAcc[question.id] = null;
    }
  }
  Object.assign(visibleAnswers, visibleAnswersAcc);

  const total = AUDIT_STEP_21_QUESTIONS.length;
  const answered = countAuditStep21Answered(
    AUDIT_STEP_21_QUESTIONS,
    answersForStep
  );
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditGerchikovList
        questions={AUDIT_STEP_21_QUESTIONS}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

function Step24EruditionBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
}: AuditStepQuestionsRouterProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, optionId: string) => {
      setAuditAnswer(stepIndex, questionId, optionId);
    },
    [setAuditAnswer, stepIndex]
  );

  const total = AUDIT_STEP_24_QUESTIONS.length;
  const visibleAnswers: Record<string, string | null> = {};
  for (const question of AUDIT_STEP_24_QUESTIONS) {
    const key = `q${String(question.index)}`;
    const raw = answersForStep[key];
    visibleAnswers[key] = typeof raw === "string" && raw.length > 0 ? raw : null;
  }
  const currentIndex = getNextUnansweredStep24Index(
    AUDIT_STEP_24_QUESTIONS,
    visibleAnswers
  );
  const answered = currentIndex;
  const allAnswered = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={allAnswered}
      onComplete={onComplete}
      rightSlot={rightSlot}
      showCompleteButton={allAnswered}
      progressLeftLabel={
        allAnswered
          ? `Все вопросы пройдены (${String(total)} из ${String(total)})`
          : `Вопрос ${String(Math.min(answered + 1, total))} из ${String(total)}`
      }
      belowProgress={
        <p className="text-[13px] text-[#5F5E5E]">
          Тест завершится автоматически по истечении таймера. Отвечайте, сколько успеете —
          можно не пытаться пройти весь пул.
        </p>
      }
    >
      <AuditEruditionPool
        questions={AUDIT_STEP_24_QUESTIONS}
        answers={visibleAnswers}
        currentIndex={currentIndex}
        onAnswer={handleAnswer}
      />
    </AuditQuestionsLayout>
  );
}

type StepCfitBodyProps = AuditStepQuestionsRouterProps & {
  items: ReadonlyArray<AuditCfitItem>;
};

function StepCfitBody({
  step,
  displayStepIndex,
  totalSteps,
  onComplete,
  rightSlot,
  items,
}: StepCfitBodyProps): React.ReactElement {
  const stepIndex = step.stepIndex;
  const cfitKey = step.internalKey as AuditCfitSubtestInternalKey;
  const setAuditAnswer = useAuditFormStore((s) => s.setAuditAnswer);
  const answersForStep: AuditStepAnswers =
    useAuditFormStore((s) => s.answers[stepIndex]) ?? {};

  const handleAnswer = useCallback(
    (questionId: string, value: AuditCfitChoiceDigit) => {
      setAuditAnswer(stepIndex, questionId, value);
    },
    [setAuditAnswer, stepIndex]
  );

  const visibleAnswers: Record<string, AuditCfitAnswer> = {};
  for (const item of items) {
    const key = `q${String(item.index)}`;
    visibleAnswers[key] = _coerceCfitAnswer(answersForStep[key]);
  }

  const total = items.length;
  const answered = getStepAnsweredCount(answersForStep);
  const canComplete = answered >= total;

  return (
    <AuditQuestionsLayout
      stepIndex={displayStepIndex}
      totalSteps={totalSteps}
      answered={answered}
      total={total}
      canComplete={canComplete}
      onComplete={onComplete}
      rightSlot={rightSlot}
    >
      <AuditCfitList
        items={items}
        answers={visibleAnswers}
        onAnswer={handleAnswer}
        stimulusSize="compact"
        promptKind={_auditCfitPromptKindForSubtest(cfitKey)}
      />
    </AuditQuestionsLayout>
  );
}

function _auditCfitPromptKindForSubtest(key: AuditCfitSubtestInternalKey): AuditCfitPromptKind {
  switch (key) {
    case "cfit_subtest_1":
    case "cfit_subtest_5":
      return "series_completion";
    case "cfit_subtest_2":
    case "cfit_subtest_6":
      return "classification_five";
    case "cfit_subtest_3":
    case "cfit_subtest_7":
      return "complete_drawing";
    default:
      return "stem_plus_choices";
  }
}

function _coerceCfitAnswer(raw: unknown): AuditCfitAnswer {
  return normalizeAuditCfitChoice(raw);
}
