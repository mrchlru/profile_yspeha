"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { StepLayout } from "@/components/StepLayout";
import { useBurnoutAccessReady } from "@/hooks/useBurnoutAccessGate";
import {
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";
import { useFormStore } from "@/store/useFormStore";
import {
  type BurnoutSubmissionStatus,
  useBurnoutFormStore,
} from "@/store/useBurnoutFormStore";

function getSubmitStatusText(status: BurnoutSubmissionStatus): string {
  switch (status) {
    case "submitting":
      return "Сохраняем ваши ответы…";
    case "submitted":
      return "Ответы успешно сохранены.";
    case "error":
      return "Не удалось сохранить ответы.";
    case "idle":
    default:
      return "Подготовка к сохранению…";
  }
}

/**
 * Финальный экран теста на выгорание.
 */
export default function BurnoutFinishPage(): React.ReactElement {
  const router = useRouter();
  const accessReady = useBurnoutAccessReady();
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  const clearValidatedAccess = useFormStore((s) => s.clearValidatedAccess);
  const submissionStatus = useBurnoutFormStore((s) => s.submissionStatus);
  const submitError = useBurnoutFormStore((s) => s.submitError);
  const submitBurnout = useBurnoutFormStore((s) => s.submitBurnout);
  const resetBurnoutAfterFinish = useBurnoutFormStore((s) => s.resetBurnoutAfterFinish);

  useEffect(() => {
    if (!accessReady) {
      return;
    }
    if (submissionStatus !== "idle") {
      return;
    }
    void submitBurnout(validatedAccessCode);
  }, [accessReady, submissionStatus, submitBurnout, validatedAccessCode]);

  if (!accessReady) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  function handleExit(): void {
    resetBurnoutAfterFinish();
    clearValidatedAccess();
    router.replace("/");
  }

  return (
    <StepLayout>
      <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2">
        <div className={`w-full max-w-[720px] space-y-5 px-8 py-8 ${stepSurfaceCardClass}`}>
          <h1 className="text-[28px] font-extrabold text-[#8C8C8C]">Спасибо!</h1>
          <p className={stepSecondaryTextClass}>{getSubmitStatusText(submissionStatus)}</p>
          {submitError ? (
            <p className="text-sm font-medium text-red-700/90" role="alert">
              {submitError}
            </p>
          ) : null}
          {submissionStatus === "error" ? (
            <Button
              type="button"
              onClick={() => void submitBurnout(validatedAccessCode)}
              className={stepNavPrimaryButtonClass}
            >
              Повторить отправку
            </Button>
          ) : null}
          {submissionStatus === "submitted" ? (
            <Button type="button" onClick={handleExit} className={stepNavPrimaryButtonClass}>
              Закрыть
            </Button>
          ) : null}
        </div>
      </div>
    </StepLayout>
  );
}
