"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { StepLayout } from "@/components/StepLayout";
import { TestMotivation } from "@/components/TestMotivation";
import { KotIntroSection } from "@/components/kot/KotIntroSection";
import { KotQuestionsList } from "@/components/kot/KotQuestionsList";
import { KotStep1NavWithTimer } from "@/components/kot/KotStep1NavWithTimer";
import { KotTimerSticky, KotTimingProvider } from "@/components/kot/KotTimeGate";
import { KotTimeoutAutoAdvance } from "@/components/kot/KotTimeoutAutoAdvance";
import { useScreeningStepLog } from "@/lib/logging/useScreeningStepLog";
import { stepPageContentClass } from "@/lib/stepPageTheme";
import { TOTAL_QUESTIONS_COUNT, getAllAnsweredCount, isProfileReady } from "@/lib/progress";
import { setScreeningMaxStepCookie } from "@/lib/screeningProgressCookie";
import { getContinueButtonLabel } from "@/lib/testMotivation";
import { useFormStore } from "@/store/useFormStore";
import { useScreeningAccessReady } from "@/hooks/useAccessGate";

export default function Step1Page(): React.ReactElement {
  const router = useRouter();
  const accessReady = useScreeningAccessReady();
  const profileName = useFormStore((s) => s.profileName);
  const personalDataConsent = useFormStore((s) => s.personalDataConsent);
  const consentRecordedAt = useFormStore((s) => s.consentRecordedAt);
  const sessionId = useFormStore((s) => s.sessionId);
  const kotTimerStartedAt = useFormStore((s) => s.kotTimerStartedAt);
  useScreeningStepLog("step-1", sessionId);
  const step1Data = useFormStore((s) => s.step1Data);
  const step2Data = useFormStore((s) => s.step2Data);
  const step3Data = useFormStore((s) => s.step3Data);
  const step4Data = useFormStore((s) => s.step4Data);

  const kotStarted = kotTimerStartedAt !== null;

  useEffect(() => {
    if (!accessReady) {
      return;
    }
    if (!isProfileReady(profileName, personalDataConsent, consentRecordedAt)) {
      router.replace("/intro");
      return;
    }
    if (!sessionId) {
      router.replace("/briefing");
    }
  }, [
    accessReady,
    consentRecordedAt,
    personalDataConsent,
    profileName,
    router,
    sessionId,
  ]);

  useEffect(() => {
    setScreeningMaxStepCookie(1);
  }, []);

  const answeredCount = getAllAnsweredCount(step1Data, step2Data, step3Data, step4Data);
  const continueLabel = getContinueButtonLabel(answeredCount);

  if (!accessReady) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout>
      <div className={stepPageContentClass}>
        <div className="mb-2">
          <ProgressBar answeredQuestions={answeredCount} totalQuestions={TOTAL_QUESTIONS_COUNT} />
          <TestMotivation profileName={profileName} answeredCount={answeredCount} />
        </div>

        {kotStarted ? (
          <KotTimingProvider>
            <KotTimeoutAutoAdvance />
            <KotTimerSticky />
            <KotIntroSection showStartButton={false} />
            <KotQuestionsList />
            <KotStep1NavWithTimer continueLabel={continueLabel} />
          </KotTimingProvider>
        ) : (
          <>
            <KotIntroSection showStartButton />
            <div className="mt-7 flex flex-wrap items-center justify-start gap-3">
              <Button
                variant="secondary"
                onClick={() => router.push("/briefing")}
                className="w-[160px]"
              >
                Назад
              </Button>
            </div>
          </>
        )}
      </div>
    </StepLayout>
  );
}
