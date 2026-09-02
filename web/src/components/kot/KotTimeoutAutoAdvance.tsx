"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useKotBlockAnswersFromTimer } from "@/components/kot/KotTimeGate";
import { clientSessionRef, screeningClientLog } from "@/lib/logging/screeningClientLog";
import { finalizeKotStep1AfterTimeout } from "@/lib/kot/kotStep1Finalize";
import { queueScreeningStepSync } from "@/lib/screening/syncScreeningStepClient";
import { setScreeningMaxStepCookie } from "@/lib/screeningProgressCookie";
import { useFormStore } from "@/store/useFormStore";

/**
 * По истечении 20 минут: фиксируем неотвеченные как пустые строки (0 баллов по ключу)
 * и сразу открываем шаг 2 без нажатия «Далее».
 */
export function KotTimeoutAutoAdvance(): null {
  const router = useRouter();
  const blockAnswers = useKotBlockAnswersFromTimer();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!blockAnswers || firedRef.current) {
      return;
    }
    firedRef.current = true;
    const { step1Data, sessionId, setStep1Data } = useFormStore.getState();
    setStep1Data(finalizeKotStep1AfterTimeout(step1Data));
    screeningClientLog("kot_timeout_auto_advance", {
      sessionRef: clientSessionRef(sessionId) ?? "none",
    });
    setScreeningMaxStepCookie(2);
    queueScreeningStepSync(1);
    router.replace("/step-2");
  }, [blockAnswers, router]);

  return null;
}
