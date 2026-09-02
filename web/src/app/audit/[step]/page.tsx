"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StepLayout } from "@/components/StepLayout";
import { AuditTestIntro } from "@/components/audit/AuditTestIntro";
import { AuditStepQuestionsRouter } from "@/components/audit/AuditStepQuestionsRouter";
import { AuditStepTimerHost } from "@/components/audit/AuditStepTimerHost";
import { OdIdentityCheckOverlay } from "@/components/identity/OdIdentityCheckOverlay";
import { useAuditStepReady } from "@/hooks/useAuditAccessGate";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useFormStore } from "@/store/useFormStore";
import {
  AUDIT_TOTAL_STEPS,
  getAuditStepByIndex,
  getAuditStepBySlug,
  getNextAuditStep,
} from "@/lib/audit/auditSteps";
import {
  getAuditBatteryById,
  getNextBatteryStepIndexFromSequence,
  getBatterySequenceStepProgress,
} from "@/lib/audit/auditBatteries";
import { getBatteryNextRouteAfterStep } from "@/lib/audit/batteryNavigation";
import { getAuditIntroText } from "@/lib/audit/auditIntros";
import type { AuditStepConfig } from "@/lib/audit/auditTypes";
import {
  buildOdIdentityChallenge,
  isOdIdentityQuestionnaireComplete,
  pickRandomOdIdentityField,
} from "@/lib/identity/odIdentityCheck";
import { needsOdIdentityQuestionnaire } from "@/lib/identity/needsOdIdentityQuestionnaire";
import { postIdentityCheckEvent } from "@/lib/identity/postIdentityCheckEvent";
import { shouldShowOdIdentityCheck } from "@/lib/identity/shouldShowOdIdentityCheck";
import type { OdIdentityChallenge } from "@/lib/identity/odIdentityTypes";
import type { OdIdentityCheckOutcome } from "@/lib/identity/odIdentityTypes";
import { readProctorStepContext } from "@/lib/proctor/proctorStepContext";
import { navigateAfterFormPersist } from "@/lib/navigateAfterFormPersist";
import { scrollPageToTop } from "@/lib/scrollPageToTop";

/**
 * Динамическая страница шага аудита. Маршрут: `/audit/<slug>`.
 */
export default function AuditStepPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ step: string }>();
  const slug = typeof params.step === "string" ? params.step : "";
  const step = useMemo(() => getAuditStepBySlug(slug), [slug]);

  const stepIndex = step?.stepIndex ?? 0;
  const stepReady = useAuditStepReady(stepIndex);
  const markStepReached = useAuditFormStore((s) => s.markStepReached);
  const markStepCompleted = useAuditFormStore((s) => s.markStepCompleted);
  const clearStepTimer = useAuditFormStore((s) => s.clearStepTimer);
  const inheritStepTimer = useAuditFormStore((s) => s.inheritStepTimer);
  const batteryId = useAuditFormStore((s) => s.batteryId);
  const batteryStepSequence = useAuditFormStore((s) => s.batteryStepSequence);
  const odIdentityQuestionnaire = useAuditFormStore((s) => s.odIdentityQuestionnaire);
  const odIdentityCheckShownStepIndexes = useAuditFormStore(
    (s) => s.odIdentityCheckShownStepIndexes
  );
  const markOdIdentityCheckShown = useAuditFormStore((s) => s.markOdIdentityCheckShown);
  const sessionId = useAuditFormStore((s) => s.sessionId);
  const accessCodeSnapshot = useAuditFormStore((s) => s.accessCodeSnapshot);
  const activeTestKind = useFormStore((s) => s.activeTestKind);
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);

  const battery =
    batteryId !== null ? getAuditBatteryById(batteryId) : null;
  const sequenceProgress =
    batteryStepSequence !== null
      ? getBatterySequenceStepProgress(batteryStepSequence, stepIndex)
      : null;
  const displayTotalSteps = sequenceProgress?.totalSteps ?? AUDIT_TOTAL_STEPS;
  const displayStepIndex = sequenceProgress?.stepNumber ?? stepIndex;

  const [phase, setPhase] = useState<"intro" | "questions">(() =>
    step?.joinPreviousStep === true ? "questions" : "intro"
  );
  const [identityChallenge, setIdentityChallenge] = useState<OdIdentityChallenge | null>(
    null
  );

  useEffect(() => {
    if (step === null) {
      return;
    }
    setPhase(step.joinPreviousStep === true ? "questions" : "intro");
    setIdentityChallenge(null);
    scrollPageToTop();
  }, [slug, step]);

  useEffect(() => {
    if (step === null) {
      router.replace("/audit/intro");
    }
  }, [router, step]);

  useEffect(() => {
    if (!stepReady || step === null) {
      return;
    }
    if (
      needsOdIdentityQuestionnaire({
        batteryId,
        testKind: activeTestKind,
        isReturningSession: false,
        questionnaire: odIdentityQuestionnaire,
      })
    ) {
      router.replace("/audit/questionnaire");
    }
  }, [
    activeTestKind,
    batteryId,
    odIdentityQuestionnaire,
    router,
    step,
    stepReady,
  ]);

  useEffect(() => {
    if (!stepReady || step === null) {
      return;
    }
    markStepReached(step.stepIndex);
  }, [markStepReached, step, stepReady]);

  const handleCompleteStep = useCallback(
    (completedStep: AuditStepConfig) => {
      let next = getNextAuditStep(completedStep.stepIndex);
      if (battery !== null && batteryStepSequence !== null) {
        const nextIndex = getNextBatteryStepIndexFromSequence(
          batteryStepSequence,
          completedStep.stepIndex
        );
        next = nextIndex !== null ? getAuditStepByIndex(nextIndex) : null;
      }
      if (next !== null && next.joinPreviousStep === true) {
        inheritStepTimer(completedStep.stepIndex, next.stepIndex);
      }
      clearStepTimer(completedStep.stepIndex);
      markStepCompleted(completedStep.stepIndex);
      if (battery !== null && batteryStepSequence !== null) {
        const nextRoute = getBatteryNextRouteAfterStep(
          batteryStepSequence,
          completedStep.stepIndex
        );
        if (nextRoute !== null) {
          navigateAfterFormPersist(router, nextRoute);
          return;
        }
        navigateAfterFormPersist(router, "/audit/finish");
        return;
      }
      if (next !== null) {
        navigateAfterFormPersist(router, `/audit/${next.slug}`);
        return;
      }
      navigateAfterFormPersist(router, "/audit/finish");
    },
    [battery, batteryStepSequence, clearStepTimer, inheritStepTimer, markStepCompleted, router]
  );

  const proceedToQuestions = useCallback((): void => {
    scrollPageToTop();
    setPhase("questions");
  }, []);

  const reportIdentityFailure = useCallback(
    (challenge: OdIdentityChallenge, outcome: Exclude<OdIdentityCheckOutcome, "passed">) => {
      const accessCode = (accessCodeSnapshot ?? validatedAccessCode ?? "").trim();
      if (sessionId === null || accessCode.length < 8) {
        return;
      }
      const stepLabel = readProctorStepContext()?.stepLabel ?? null;
      postIdentityCheckEvent({
        sessionId,
        accessCode,
        fieldId: challenge.fieldId,
        fieldLabel: challenge.fieldLabel,
        outcome,
        stepLabel,
      });
    },
    [accessCodeSnapshot, sessionId, validatedAccessCode]
  );

  const handleIdentityCheckComplete = useCallback(
    (outcome: OdIdentityCheckOutcome) => {
      if (step === null || identityChallenge === null) {
        return;
      }
      markOdIdentityCheckShown(step.stepIndex);
      setIdentityChallenge(null);
      if (outcome !== "passed") {
        reportIdentityFailure(identityChallenge, outcome);
      }
      proceedToQuestions();
    },
    [
      identityChallenge,
      markOdIdentityCheckShown,
      proceedToQuestions,
      reportIdentityFailure,
      step,
    ]
  );

  function handleProceedToQuestions(): void {
    if (step === null) {
      return;
    }
    if (!isOdIdentityQuestionnaireComplete(odIdentityQuestionnaire)) {
      proceedToQuestions();
      return;
    }
    const questionnaire = odIdentityQuestionnaire;
    if (
      shouldShowOdIdentityCheck({
        batteryId,
        questionnaire,
        stepIndex: step.stepIndex,
        shownStepIndexes: odIdentityCheckShownStepIndexes,
        joinPreviousStep: step.joinPreviousStep === true,
        sessionId,
      })
    ) {
      const field = pickRandomOdIdentityField(questionnaire);
      setIdentityChallenge(buildOdIdentityChallenge(questionnaire, field));
      return;
    }
    proceedToQuestions();
  }

  if (step === null) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  if (!stepReady) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  const intro = getAuditIntroText(step.introKey);
  const onCompleteThisStep = (): void => handleCompleteStep(step);

  return (
    <StepLayout>
      {identityChallenge !== null ? (
        <OdIdentityCheckOverlay
          challenge={identityChallenge}
          onComplete={handleIdentityCheckComplete}
        />
      ) : null}

      {phase === "intro" ? (
        <AuditTestIntro
          stepIndex={displayStepIndex}
          totalSteps={displayTotalSteps}
          intro={intro}
          onProceed={handleProceedToQuestions}
        />
      ) : step.timerSeconds !== null ? (
        <AuditStepTimerHost
          stepIndex={step.stepIndex}
          totalSeconds={step.timerSeconds}
          onExpire={onCompleteThisStep}
        >
          {(timerBadge) => (
            <AuditStepQuestionsRouter
              step={step}
              displayStepIndex={displayStepIndex}
              totalSteps={displayTotalSteps}
              onComplete={onCompleteThisStep}
              rightSlot={timerBadge}
            />
          )}
        </AuditStepTimerHost>
      ) : (
        <AuditStepQuestionsRouter
          step={step}
          displayStepIndex={displayStepIndex}
          totalSteps={displayTotalSteps}
          onComplete={onCompleteThisStep}
        />
      )}
    </StepLayout>
  );
}
