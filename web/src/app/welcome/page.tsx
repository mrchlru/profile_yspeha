"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { StepLayout } from "@/components/StepLayout";
import { useScreeningAccessReady } from "@/hooks/useAccessGate";
import { useScreeningStepLog } from "@/lib/logging/useScreeningStepLog";
import { useFormStore } from "@/store/useFormStore";

export default function WelcomePage(): React.ReactElement {
  const router = useRouter();
  const accessReady = useScreeningAccessReady();
  const sessionId = useFormStore((s) => s.sessionId);
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  const clearValidatedAccess = useFormStore((s) => s.clearValidatedAccess);
  useScreeningStepLog("welcome", sessionId);

  useEffect(() => {
    if (accessReady) {
      router.replace("/audit/intro");
    }
  }, [accessReady, router]);

  useEffect(() => {
    if (!accessReady || !validatedAccessCode) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/access/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: validatedAccessCode }),
      });
      if (cancelled || res.ok) {
        return;
      }
      clearValidatedAccess();
      router.replace("/");
    })();
    return () => {
      cancelled = true;
    };
  }, [accessReady, validatedAccessCode, clearValidatedAccess, router]);

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
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-[860px] rounded-[34px] bg-[#DDDDDD] shadow-[0px_4px_75px_0px_rgba(0,0,0,0.20)] px-[48px] py-[24px]">
          <div className="text-[#5F5E5E] text-[20px] font-normal leading-[1.4]">
            <p>
              Мы ценим ваше время и хотим, чтобы наше дальнейшее общение
              было максимально предметным и полезным для обеих сторон.
            </p>
            <br />
            <p>
              Просим вас уделить около 40 минут на этот интерактивный опрос.{" "}
              Он состоит из 4 коротких шагов, которые помогут нам:
            </p>
            <ul className="list-disc pl-[32px]">
              <li>Оценить общие умственные способности.</li>
              <li>Понять, что вас по-настоящему мотивирует и драйвит.</li>
              <li>
                Предложить вам позицию и условия, которые идеально подойдут
                именно вам.
              </li>
            </ul>
            <br />
            <p>
              В первом блоке важны точные ответы; в следующих шагах нам важен ваш
              реальный профессиональный стиль. Выделите спокойное время,
              налейте кофе и давайте начнем!
            </p>
          </div>

          <div className="mt-[20px] flex justify-center">
            <Button
              onClick={() => router.push("/intro")}
              className="h-[56px] px-[36px] whitespace-nowrap text-[22px] font-extrabold leading-none"
            >
              НАЧАТЬ ЗНАКОМСТВО
            </Button>
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
