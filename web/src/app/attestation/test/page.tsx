"use client";

import React, { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import { AttestationDdoPairs } from "@/components/attestation/AttestationDdoPairs";
import { AttestationLikertList } from "@/components/attestation/AttestationLikertList";
import { AttestationLuscherRankPicker } from "@/components/attestation/AttestationLuscherRankPicker";
import { AttestationQuestionsLayout } from "@/components/attestation/AttestationQuestionsLayout";
import { AttestationRosenzweigTextList } from "@/components/attestation/AttestationRosenzweigTextList";
import { StepLayout } from "@/components/StepLayout";
import { useAttestationAccessReady } from "@/hooks/useAttestationAccessGate";
import { ATTESTATION_BLOCKS } from "@/lib/attestation/attestationBlocks";
import {
  ATTESTATION_ANSWERABLE_COUNT,
  CBI_OPTIONS,
  CBI_QUESTIONS,
  countAttestationAnswered,
  isAttestationBlockComplete,
  KLIMOV_DDO_QUESTIONS,
  LUSCHER_COLORS,
  luscherRankAnswerKey,
  MANAGEMENT_POTENTIAL_QUESTIONS,
  MINI_IPIP_OPTIONS,
  MINI_IPIP_QUESTIONS,
  MP_OPTIONS,
  ROSENZWEIG_SITUATIONS,
  SPIELBERGER_OPTIONS,
  SPIELBERGER_QUESTIONS,
} from "@/lib/attestation/attestationQuestions";
import { queueAttestationAnswersSync } from "@/lib/attestation/syncAttestationAnswersClient";
import { useAttestationFormStore } from "@/store/useAttestationFormStore";

/**
 * Экран аттестации: один блок за раз.
 */
export default function AttestationTestPage(): React.ReactElement {
  const router = useRouter();
  const accessReady = useAttestationAccessReady();
  const answers = useAttestationFormStore((s) => s.answers);
  const setAnswer = useAttestationFormStore((s) => s.setAttestationAnswer);
  const sessionId = useAttestationFormStore((s) => s.sessionId);
  const currentBlockIndex = useAttestationFormStore((s) => s.currentBlockIndex);
  const setCurrentBlockIndex = useAttestationFormStore((s) => s.setCurrentBlockIndex);

  const block = ATTESTATION_BLOCKS[currentBlockIndex] ?? ATTESTATION_BLOCKS[0];
  const blockComplete = isAttestationBlockComplete(block.id, answers);
  const answeredTotal = countAttestationAnswered(answers);
  const isLastBlock = currentBlockIndex >= ATTESTATION_BLOCKS.length - 1;

  const handleAdvance = useCallback((): void => {
    if (!blockComplete) {
      return;
    }
    if (isLastBlock) {
      router.push("/attestation/finish");
      return;
    }
    setCurrentBlockIndex(currentBlockIndex + 1);
  }, [blockComplete, currentBlockIndex, isLastBlock, router, setCurrentBlockIndex]);

  const blockContent = useMemo(() => {
    switch (block.id) {
      case "mini_ipip":
        return (
          <AttestationLikertList
            questions={MINI_IPIP_QUESTIONS}
            options={MINI_IPIP_OPTIONS}
            answers={_likertAnswers(answers, MINI_IPIP_QUESTIONS)}
            onAnswer={(id, value) => setAnswer(id, value)}
          />
        );
      case "management_potential":
        return (
          <AttestationLikertList
            questions={MANAGEMENT_POTENTIAL_QUESTIONS}
            options={MP_OPTIONS}
            answers={_likertAnswers(answers, MANAGEMENT_POTENTIAL_QUESTIONS)}
            onAnswer={(id, value) => setAnswer(id, value)}
          />
        );
      case "cbi":
        return (
          <AttestationLikertList
            questions={CBI_QUESTIONS}
            options={CBI_OPTIONS}
            answers={_likertAnswers(answers, CBI_QUESTIONS)}
            onAnswer={(id, value) => setAnswer(id, value)}
          />
        );
      case "spielberger":
        return (
          <AttestationLikertList
            questions={SPIELBERGER_QUESTIONS}
            options={SPIELBERGER_OPTIONS}
            answers={_likertAnswers(answers, SPIELBERGER_QUESTIONS)}
            onAnswer={(id, value) => setAnswer(id, value)}
          />
        );
      case "klimov_ddo":
        return (
          <AttestationDdoPairs
            questions={KLIMOV_DDO_QUESTIONS}
            answers={_ddoAnswers(answers)}
            onAnswer={(id, value) => setAnswer(id, value)}
          />
        );
      case "luscher":
        return (
          <AttestationLuscherRankPicker
            answers={answers}
            onSetRank={(colorId, rank) => setAnswer(luscherRankAnswerKey(colorId), rank)}
            onReset={() => {
              useAttestationFormStore.setState((state) => {
                const nextAnswers = { ...state.answers };
                for (const color of LUSCHER_COLORS) {
                  nextAnswers[luscherRankAnswerKey(color.id)] = null;
                }
                return { answers: nextAnswers };
              });
              queueAttestationAnswersSync();
            }}
          />
        );
      case "rosenzweig":
        return (
          <AttestationRosenzweigTextList
            situations={ROSENZWEIG_SITUATIONS}
            answers={_textAnswers(answers)}
            onAnswer={(id, value) => setAnswer(id, value)}
          />
        );
      default:
        return null;
    }
  }, [answers, block.id, setAnswer]);

  if (!accessReady) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  if (!sessionId) {
    router.replace("/attestation/intro");
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Перенаправление…
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout>
      <AttestationQuestionsLayout
        blockTitle={block.candidateTitle}
        instruction={block.instruction}
        answered={answeredTotal}
        total={ATTESTATION_ANSWERABLE_COUNT}
        canAdvance={blockComplete}
        isLastBlock={isLastBlock}
        onAdvance={handleAdvance}
      >
        {blockContent}
      </AttestationQuestionsLayout>
    </StepLayout>
  );
}

function _likertAnswers(
  answers: Record<string, number | string | null>,
  questions: ReadonlyArray<{ id: string }>
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const question of questions) {
    const value = answers[question.id];
    out[question.id] = typeof value === "number" ? value : null;
  }
  return out;
}

function _ddoAnswers(
  answers: Record<string, number | string | null>
): Record<string, "a" | "b" | null> {
  const out: Record<string, "a" | "b" | null> = {};
  for (const question of KLIMOV_DDO_QUESTIONS) {
    const value = answers[question.id];
    out[question.id] = value === "a" || value === "b" ? value : null;
  }
  return out;
}

function _textAnswers(
  answers: Record<string, number | string | null>
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const situation of ROSENZWEIG_SITUATIONS) {
    const value = answers[situation.id];
    out[situation.id] = typeof value === "string" ? value : null;
  }
  return out;
}
