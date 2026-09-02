"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useKotBlockAnswersFromTimer } from "@/components/kot/KotTimeGate";
import { finalizeKotStep1AfterTimeout } from "@/lib/kot/kotStep1Finalize";
import { queueScreeningStepSync } from "@/lib/screening/syncScreeningStepClient";
import { stepNavPrimaryButtonClass } from "@/lib/stepPageTheme";
import { setScreeningMaxStepCookie } from "@/lib/screeningProgressCookie";
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

  return (
    <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
      <Button
        disabled={blockAnswers}
        onClick={() => {
          const { step1Data } = useFormStore.getState();
          setStep1Data(finalizeKotStep1AfterTimeout(step1Data));
          setScreeningMaxStepCookie(2);
          queueScreeningStepSync(1);
          router.push("/step-2");
        }}
        className={stepNavPrimaryButtonClass}
      >
        {props.continueLabel}
      </Button>
    </div>
  );
}
