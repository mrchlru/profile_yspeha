"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { StepLayout } from "@/components/StepLayout";
import { useAttestationAccessReady } from "@/hooks/useAttestationAccessGate";
import {
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";
import { useFormStore } from "@/store/useFormStore";
import {
  type AttestationSubmissionStatus,
  useAttestationFormStore,
} from "@/store/useAttestationFormStore";

function getSubmitStatusText(status: AttestationSubmissionStatus): string {
  switch (status) {
    case "submitting":
      return "Сохраняем ваши ответы…";
    case "submitted":
      return "Аттестация успешно завершена.";
    case "error":
      return "Не удалось сохранить ответы.";
    case "idle":
    default:
      return "Подготовка к сохранению…";
  }
}

/**
 * Финальный экран аттестации (без показа баллов кандидату).
 */
export default function AttestationFinishPage(): React.ReactElement {
  const router = useRouter();
  const accessReady = useAttestationAccessReady();
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  const clearValidatedAccess = useFormStore((s) => s.clearValidatedAccess);
  const submissionStatus = useAttestationFormStore((s) => s.submissionStatus);
  const submitError = useAttestationFormStore((s) => s.submitError);
  const submitAttestation = useAttestationFormStore((s) => s.submitAttestation);
  const resetAfterFinish = useAttestationFormStore((s) => s.resetAttestationAfterFinish);

  useEffect(() => {
    if (!accessReady) {
      return;
    }
    if (submissionStatus !== "idle") {
      return;
    }
    void submitAttestation(validatedAccessCode);
  }, [accessReady, submissionStatus, submitAttestation, validatedAccessCode]);

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
    resetAfterFinish();
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
              onClick={() => void submitAttestation(validatedAccessCode)}
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
