"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { StepLayout } from "@/components/StepLayout";
import {
  stepInputClass,
  stepLabelClass,
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
  stepSurfaceCardClass,
} from "@/lib/stepPageTheme";
import { useScreeningStepLog } from "@/lib/logging/useScreeningStepLog";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import {
  isAuditAccessTestKind,
  isBurnoutTestKind,
  isProfSbEducationTestKind,
  isTestKind,
} from "@/lib/access/testKinds";
import { useFormStore } from "@/store/useFormStore";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";

export default function AccessPage(): React.ReactElement {
  const router = useRouter();
  const hydrated = useFormStoreHydrated();
  const sessionId = useFormStore((s) => s.sessionId);
  useScreeningStepLog("access", sessionId);

  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  const activeTestKind = useFormStore((s) => s.activeTestKind);
  const setValidatedAccess = useFormStore((s) => s.setValidatedAccess);
  const setBatteryStepSequence = useAuditFormStore((s) => s.setBatteryStepSequence);

  const [rawCode, setRawCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (validatedAccessCode && isAuditAccessTestKind(activeTestKind)) {
      router.replace("/audit/intro");
      return;
    }
    if (validatedAccessCode && isBurnoutTestKind(activeTestKind)) {
      router.replace("/burnout/intro");
      return;
    }
    if (validatedAccessCode && isProfSbEducationTestKind(activeTestKind)) {
      router.replace("/prof-sb-education/intro");
    }
  }, [activeTestKind, hydrated, validatedAccessCode, router]);

  async function handleSubmit(): Promise<void> {
    setError(null);
    const code = normalizeAccessCode(rawCode);
    if (code.length < 8) {
      setError("Введите код полностью.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/access/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await res.json()) as {
        testKind?: string;
        auditBatteryStepOrder?: number[];
        devMode?: boolean;
        candidateFirstName?: string;
        candidateLastName?: string;
        error?: string;
      };
      if (!res.ok || !body.testKind) {
        setError(body.error ?? "Не удалось проверить код.");
        return;
      }
      if (!isTestKind(body.testKind)) {
        setError("Неизвестный тип приглашения.");
        return;
      }
      const kind = body.testKind;
      if (isAuditAccessTestKind(kind)) {
        setBatteryStepSequence(body.auditBatteryStepOrder ?? null, kind);
      } else {
        setBatteryStepSequence(null, kind);
      }
      setValidatedAccess(code, kind, {
        devMode: body.devMode === true,
        candidateFirstName: body.candidateFirstName ?? null,
        candidateLastName: body.candidateLastName ?? null,
      });
      if (isAuditAccessTestKind(kind)) {
        router.push("/audit/intro");
      } else if (isBurnoutTestKind(kind)) {
        router.push("/burnout/intro");
      } else if (isProfSbEducationTestKind(kind)) {
        router.push("/prof-sb-education/intro");
      } else {
        setError("Неизвестный тип приглашения.");
      }
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) {
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
      <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2">
        <div className={`w-full max-w-[860px] px-8 py-8 ${stepSurfaceCardClass}`}>
          <p className={`text-[20px] sm:text-[22px] ${stepSecondaryTextClass}`}>
            Для входа в сервис тестирования введите код из письма-приглашения.
          </p>

          <div className="mt-6">
            <label htmlFor="access-code" className={`block ${stepLabelClass}`}>
              Код доступа
            </label>
            <input
              id="access-code"
              value={rawCode}
              onChange={(event) => setRawCode(event.target.value.toUpperCase())}
              autoComplete="one-time-code"
              placeholder="Например, P6FVAG7RAB47"
              className={`${stepInputClass} h-12 font-mono text-[18px] tracking-wide`}
            />
          </div>

          {error ? (
            <p className="mt-3 text-sm font-medium text-red-700/90" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <Button
              onClick={() => void handleSubmit()}
              disabled={busy}
              className={`${stepNavPrimaryButtonClass} min-w-[220px]`}
            >
              {busy ? "Проверка…" : "ПРОДОЛЖИТЬ"}
            </Button>
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
