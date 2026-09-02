"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { StepLayout } from "@/components/StepLayout";
import { useProfSbEducationAccessReady } from "@/hooks/useProfSbEducationAccessGate";
import {
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";
import { useFormStore } from "@/store/useFormStore";
import {
  type ProfSbEducationSubmissionStatus,
  useProfSbEducationFormStore,
} from "@/store/useProfSbEducationFormStore";

function getSubmitStatusText(status: ProfSbEducationSubmissionStatus): string {
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
 * Финальный экран анкеты «ПРОФ СБ + ПРОФ образование».
 */
export default function ProfSbEducationFinishPage(): React.ReactElement {
  const router = useRouter();
  const accessReady = useProfSbEducationAccessReady();
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  const clearValidatedAccess = useFormStore((s) => s.clearValidatedAccess);
  const submissionStatus = useProfSbEducationFormStore((s) => s.submissionStatus);
  const submitError = useProfSbEducationFormStore((s) => s.submitError);
  const submitProfSbEducation = useProfSbEducationFormStore((s) => s.submitProfSbEducation);
  const resetProfSbEducationAfterFinish = useProfSbEducationFormStore(
    (s) => s.resetProfSbEducationAfterFinish
  );

  useEffect(() => {
    if (!accessReady) {
      return;
    }
    if (submissionStatus !== "idle") {
      return;
    }
    void submitProfSbEducation(validatedAccessCode);
  }, [accessReady, submissionStatus, submitProfSbEducation, validatedAccessCode]);

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
    resetProfSbEducationAfterFinish();
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
              onClick={() => void submitProfSbEducation(validatedAccessCode)}
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
