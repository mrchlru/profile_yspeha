"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useKotBlockAnswersFromTimer } from "@/components/kot/KotTimeGate";
import { finalizeKotStep1AfterTimeout } from "@/lib/kot/kotStep1Finalize";
import { syncScreeningStepNow } from "@/lib/screening/syncScreeningStepClient";
import { formatStepSaveError } from "@/lib/sync/formatStepSaveError";
import { stepNavPrimaryButtonClass } from "@/lib/stepPageTheme";
import { setScreeningMaxStepCookie } from "@/lib/screeningProgressCookie";
import { StepSaveErrorNotice } from "@/components/StepSaveErrorNotice";
import { useFormStore } from "@/store/useFormStore";

type Props = {
  continueLabel: string;
};

/**
 * Нижняя панель КОТ после «СТАРТ»: без «Назад»; «Далее» всегда доступна,
 * неотвеченное при переходе фиксируется как пропуск (как по тайм-ауту).
 */
export function KotStep1NavWithTimer(props: Props): React.ReactElement {
  const router = useRouter();
  const blockAnswers = useKotBlockAnswersFromTimer();
  const setStep1Data = useFormStore((s) => s.setStep1Data);
  const [stepSaveError, setStepSaveError] = useState<string | null>(null);
  const [stepSaveInFlight, setStepSaveInFlight] = useState(false);

  return (
  <>
    <StepSaveErrorNotice message={stepSaveError} saving={stepSaveInFlight} />
    <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
      <Button
        disabled={blockAnswers || stepSaveInFlight}
        onClick={() => {
          void (async () => {
            setStepSaveInFlight(true);
            setStepSaveError(null);
            try {
              const { step1Data } = useFormStore.getState();
              setStep1Data(finalizeKotStep1AfterTimeout(step1Data));
              setScreeningMaxStepCookie(2);
              await syncScreeningStepNow(1);
              router.push("/step-2");
            } catch (err) {
              setStepSaveError(formatStepSaveError(err));
            } finally {
              setStepSaveInFlight(false);
            }
          })();
        }}
        className={stepNavPrimaryButtonClass}
      >
        {props.continueLabel}
      </Button>
    </div>
  </>
  );
}
