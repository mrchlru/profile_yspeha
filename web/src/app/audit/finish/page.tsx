"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { StepLayout } from "@/components/StepLayout";
import {
  stepSecondaryTextClass,
  stepSurfaceCardClass,
  stepSectionTitleClass,
} from "@/lib/stepPageTheme";
import { isAuditDevInvite } from "@/lib/access/testKinds";
import { useAuditAccessReady } from "@/hooks/useAuditAccessGate";
import {
  type AuditSubmissionStatus,
  useAuditFormStore,
} from "@/store/useAuditFormStore";
import { useFormStore } from "@/store/useFormStore";

function getAuditSubmitStatusText(
  status: AuditSubmissionStatus,
  isDev: boolean
): string {
  switch (status) {
    case "submitting":
      return isDev ? "Формируем текстовый отчёт…" : "Сохраняем ваши ответы…";
    case "submitted":
      return isDev ? "Текстовый отчёт готов." : "Ответы успешно сохранены.";
    case "error":
      return isDev ? "Не удалось сформировать отчёт." : "Не удалось сохранить ответы.";
    case "idle":
    default:
      return isDev
        ? "Подготовка текстового отчёта…"
        : "Подготовка к сохранению ответов…";
  }
}

/**
 * Финальный экран аудита.
 *
 * Прод (`state_audit`): полный пайплайн `/api/audit/submit` (ИИ + PDF + email).
 * DEV (`state_audit_dev`): `/api/audit/dev-submit` — plain-text на экран и в письмо.
 */
export default function AuditFinishPage(): React.ReactElement {
  const router = useRouter();
  const accessReady = useAuditAccessReady();
  const activeTestKind = useFormStore((s) => s.activeTestKind);
  const activeInviteDevMode = useFormStore((s) => s.activeInviteDevMode);
  const isDev = isAuditDevInvite(activeTestKind, activeInviteDevMode);

  const resetAuditAfterFinish = useAuditFormStore((s) => s.resetAuditAfterFinish);
  const submissionStatus = useAuditFormStore((s) => s.submissionStatus);
  const submitError = useAuditFormStore((s) => s.submitError);
  const devTextReport = useAuditFormStore((s) => s.devTextReport);
  const devEmailSent = useAuditFormStore((s) => s.devEmailSent);
  const submitAudit = useAuditFormStore((s) => s.submitAudit);
  const submitAuditDev = useAuditFormStore((s) => s.submitAuditDev);
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  const clearValidatedAccess = useFormStore((s) => s.clearValidatedAccess);

  useEffect(() => {
    if (!accessReady) {
      return;
    }
    if (submissionStatus !== "idle") {
      return;
    }
    if (isDev) {
      void submitAuditDev(validatedAccessCode);
      return;
    }
    void submitAudit(validatedAccessCode);
  }, [
    accessReady,
    isDev,
    submissionStatus,
    submitAudit,
    submitAuditDev,
    validatedAccessCode,
  ]);

  if (!accessReady) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  function handleHome(): void {
    resetAuditAfterFinish();
    clearValidatedAccess();
    router.replace("/");
  }

  function handleRetry(): void {
    useAuditFormStore.setState({
      submissionStatus: "idle",
      submitError: null,
      devTextReport: null,
      devEmailSent: null,
    });
  }

  const showCompletionCopy = submissionStatus === "submitted";
  const showRetry = submissionStatus === "error";

  return (
    <StepLayout>
      <div className="flex flex-1 justify-center px-4 pb-10 pt-2">
        <div className={`w-full max-w-[960px] px-8 py-8 ${stepSurfaceCardClass}`}>
          <h1 className={stepSectionTitleClass}>
            {isDev
              ? showCompletionCopy
                ? "DEV · текстовый отчёт"
                : "DEV · формирование отчёта"
              : showCompletionCopy
                ? "Тестирование завершено"
                : "Сохранение результатов"}
          </h1>

          {showCompletionCopy ? (
            isDev ? (
              <div className={`space-y-3 text-[16px] ${stepSecondaryTextClass}`}>
                <p>
                  Ниже — скоринг и интерпретация по шагам, на которые есть ответы (без PDF и
                  без ИИ).
                </p>
                {devEmailSent === true ? (
                  <p className="text-[#0d7a5f]">Копия отчёта отправлена на почту HR.</p>
                ) : (
                  <p className="opacity-80">
                    Письмо не отправлено (SMTP не настроен или нет получателей). Отчёт доступен
                    только на экране.
                  </p>
                )}
              </div>
            ) : (
              <div className={`space-y-3 text-[18px] ${stepSecondaryTextClass}`}>
                <p>Спасибо за Ваше время и усилия.</p>
                <p>
                  Ваши ответы уже сохранены. Отчёт и письмо HR формируются на сервере в фоне — окно
                  можно закрыть.
                </p>
                <p>Для получения результатов Вы можете обратиться к заказчику тестирования.</p>
              </div>
            )
          ) : (
            <div className={`space-y-3 text-[18px] ${stepSecondaryTextClass}`}>
              <p>
                {isDev
                  ? "Дождитесь формирования отчёта. Не закрывайте окно."
                  : "Пожалуйста, дождитесь завершения сохранения. Не закрывайте окно браузера, пока ответы не будут переданы."}
              </p>
              <p className="text-[16px] opacity-90">
                {getAuditSubmitStatusText(submissionStatus, isDev)}
              </p>
            </div>
          )}

          {showCompletionCopy && isDev && devTextReport ? (
            <pre
              className="mt-6 max-h-[min(60vh,520px)] overflow-auto whitespace-pre-wrap rounded-2xl border border-black/10 bg-white/90 p-4 font-mono text-[13px] leading-relaxed text-[#3A3A3A]"
            >
              {devTextReport}
            </pre>
          ) : null}

          {showRetry && submitError ? (
            <p className={`mt-2 text-[15px] text-red-700`}>{submitError}</p>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            {showRetry ? (
              <Button onClick={handleRetry} className="min-w-[220px]">
                Повторить
              </Button>
            ) : null}

            {submissionStatus === "submitted" ? (
              <Button variant="secondary" onClick={handleHome} className="min-w-[200px]">
                На главную
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
