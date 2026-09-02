"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ProctorIntroGate } from "@/components/proctor/ProctorIntroGate";
import { StepLayout } from "@/components/StepLayout";
import {
  stepSecondaryTextClass,
  stepSurfaceCardClass,
  stepSectionTitleClass,
  stepNavPrimaryButtonClass,
} from "@/lib/stepPageTheme";
import { useAuditAccessReady } from "@/hooks/useAuditAccessGate";
import { useProctorIntroReady, useProctorIntroRequired } from "@/hooks/useProctorIntro";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useFormStore } from "@/store/useFormStore";
import { AUDIT_STEPS, getAuditStepByIndex } from "@/lib/audit/auditSteps";
import {
  getAuditBatteryForTestKind,
  getBatteryFirstStepSlugFromSequence,
} from "@/lib/audit/auditBatteries";
import { testKindUsesInviteAssesseeName } from "@/lib/access/testKinds";
import {
  getBatteryEntryRouteFromSequence,
  getBatteryResumeRouteFromSequence,
} from "@/lib/audit/batteryNavigation";
import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import { ensureBatteryProfSbRouteCookie } from "@/lib/ensureBatteryProfSbRouteCookie";
import { needsOdIdentityQuestionnaire } from "@/lib/identity/needsOdIdentityQuestionnaire";

/**
 * Стартовый экран аудита состояния — аналог приветственного экрана Fisom lab,
 * но переведён на наш бренд. Формулировки про условия прохождения сохранены
 * по требованию заказчика (см. скриншоты Fisom lab).
 */
export default function AuditIntroPage(): React.ReactElement {
  const router = useRouter();
  const accessReady = useAuditAccessReady();
  const validatedAccessCode = useFormStore((s) => s.validatedAccessCode);
  const clearValidatedAccess = useFormStore((s) => s.clearValidatedAccess);
  const inviteCandidateFirstName = useFormStore((s) => s.inviteCandidateFirstName);
  const inviteCandidateLastName = useFormStore((s) => s.inviteCandidateLastName);
  const beginAuditSession = useAuditFormStore((s) => s.beginAuditSession);
  const leaveAuditSession = useAuditFormStore((s) => s.leaveAuditSession);
  const activeTestKind = useFormStore((s) => s.activeTestKind);
  const batteryStepSequence = useAuditFormStore((s) => s.batteryStepSequence);
  const currentStep = useAuditFormStore((s) => s.currentStep);
  const setAuditAssesseeName = useAuditFormStore((s) => s.setAuditAssesseeName);
  const setPersonalDataConsent = useAuditFormStore((s) => s.setPersonalDataConsent);
  const setAccessCodeSnapshot = useAuditFormStore((s) => s.setAccessCodeSnapshot);
  const proctorRequired = useProctorIntroRequired();
  const proctorReady = useProctorIntroReady();
  const setBatteryStepSequence = useAuditFormStore((s) => s.setBatteryStepSequence);
  const maxUnlockedStep = useAuditFormStore((s) => s.maxUnlockedStep);
  const batterySequenceUnlockedThrough = useAuditFormStore(
    (s) => s.batterySequenceUnlockedThrough
  );
  const storedFirstName = useAuditFormStore((s) => s.firstName);
  const storedLastName = useAuditFormStore((s) => s.lastName);
  const odIdentityQuestionnaire = useAuditFormStore((s) => s.odIdentityQuestionnaire);
  const [firstNameInput, setFirstNameInput] = useState<string>(storedFirstName);
  const [lastNameInput, setLastNameInput] = useState<string>(storedLastName);

  useEffect(() => {
    setFirstNameInput(storedFirstName);
    setLastNameInput(storedLastName);
  }, [storedFirstName, storedLastName]);

  useEffect(() => {
    if (
      inviteCandidateFirstName &&
      inviteCandidateLastName &&
      (storedFirstName.trim().length === 0 || storedLastName.trim().length === 0)
    ) {
      setAuditAssesseeName(inviteCandidateFirstName, inviteCandidateLastName);
      setFirstNameInput(inviteCandidateFirstName);
      setLastNameInput(inviteCandidateLastName);
    }
  }, [
    inviteCandidateFirstName,
    inviteCandidateLastName,
    setAuditAssesseeName,
    storedFirstName,
    storedLastName,
  ]);

  useEffect(() => {
    if (!accessReady || !validatedAccessCode) {
      return;
    }
    setAccessCodeSnapshot(validatedAccessCode);
  }, [accessReady, setAccessCodeSnapshot, validatedAccessCode]);

  useEffect(() => {
    if (!accessReady || !validatedAccessCode) {
      return;
    }
    const auditState = useAuditFormStore.getState();
    const battery = getAuditBatteryForTestKind(activeTestKind);
    const isReturningSession =
      auditState.maxUnlockedStep > 0 ||
      (battery !== null &&
        (auditState.currentStep > 0 || auditState.batterySequenceUnlockedThrough > 0));
    if (isReturningSession) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/access/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: validatedAccessCode }),
      });
      const body = (await res.json()) as {
        testKind?: string;
        auditBatteryStepOrder?: number[];
        devMode?: boolean;
        candidateFirstName?: string;
        candidateLastName?: string;
      };
      if (cancelled || res.ok) {
        if (
          res.ok &&
          body.auditBatteryStepOrder !== undefined &&
          activeTestKind &&
          auditState.batteryStepSequence === null
        ) {
          setBatteryStepSequence(body.auditBatteryStepOrder, activeTestKind);
        }
        if (
          res.ok &&
          body.candidateFirstName &&
          body.candidateLastName
        ) {
          setAuditAssesseeName(body.candidateFirstName, body.candidateLastName);
          setFirstNameInput(body.candidateFirstName);
          setLastNameInput(body.candidateLastName);
        }
        return;
      }
      // Код больше не действителен (исчерпан / отозван / истёк) — сбрасываем
      // локальную сессию аудита и возвращаем пользователя на стартовый экран.
      leaveAuditSession();
      clearValidatedAccess();
      router.replace("/");
    })();
    return () => {
      cancelled = true;
    };
  }, [accessReady, validatedAccessCode, clearValidatedAccess, leaveAuditSession, router, activeTestKind, setBatteryStepSequence]);

  if (!accessReady) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  const battery = getAuditBatteryForTestKind(activeTestKind);
  const isReturningSession =
    maxUnlockedStep > 0 ||
    (battery !== null && (currentStep > 0 || batterySequenceUnlockedThrough > 0));
  const firstStepSlug = (() => {
    if (isReturningSession && currentStep > 0) {
      return getAuditStepByIndex(currentStep)?.slug ?? "s01";
    }
    if (battery !== null && batteryStepSequence !== null && batteryStepSequence.length > 0) {
      return getBatteryFirstStepSlugFromSequence(batteryStepSequence) ?? "s01";
    }
    return AUDIT_STEPS[0]?.slug ?? "s01";
  })();
  const continueRoute = (() => {
    if (battery !== null && batteryStepSequence !== null && batteryStepSequence.length > 0) {
      if (isReturningSession) {
        return getBatteryResumeRouteFromSequence(
          batteryStepSequence,
          batterySequenceUnlockedThrough,
          currentStep
        );
      }
      return getBatteryEntryRouteFromSequence(batteryStepSequence);
    }
    if (isReturningSession) {
      return `/audit/${firstStepSlug}`;
    }
    return `/audit/${firstStepSlug}`;
  })();
  const continueLabel = isReturningSession
    ? "Продолжить тестирование"
    : "Перейти к тестированию";

  const trimmedFirstName = firstNameInput.trim() || inviteCandidateFirstName?.trim() || "";
  const trimmedLastName = lastNameInput.trim() || inviteCandidateLastName?.trim() || "";
  const usesInviteName =
    activeTestKind !== null && testKindUsesInviteAssesseeName(activeTestKind);
  const hasInviteName = Boolean(
    (inviteCandidateFirstName?.trim() || trimmedFirstName) &&
      (inviteCandidateLastName?.trim() || trimmedLastName)
  );
  const skipNamePrompt = usesInviteName && hasInviteName;
  const assesseeKey = isReturningSession
    ? null
    : buildAuditAssesseeKey({ firstName: trimmedFirstName, lastName: trimmedLastName });
  const canStart = isReturningSession || assesseeKey !== null;
  const startDisabled = !canStart || !proctorReady;

  function handleStart(): void {
    if (!canStart || !validatedAccessCode) {
      return;
    }
    setAccessCodeSnapshot(validatedAccessCode);
    setPersonalDataConsent(true);
    if (!isReturningSession) {
      const firstName = trimmedFirstName;
      const lastName = trimmedLastName;
      setAuditAssesseeName(firstName, lastName);
      const needsQuestionnaire = needsOdIdentityQuestionnaire({
        batteryId: getAuditBatteryForTestKind(activeTestKind)?.id ?? null,
        testKind: activeTestKind,
        isReturningSession: false,
        questionnaire: odIdentityQuestionnaire,
      });
      beginAuditSession(activeTestKind);
      if (needsQuestionnaire) {
        router.push("/audit/questionnaire");
        return;
      }
      const started = useAuditFormStore.getState();
      const startedBattery = getAuditBatteryForTestKind(activeTestKind);
      const entryRoute =
        startedBattery !== null &&
        started.batteryStepSequence !== null &&
        started.batteryStepSequence.length > 0
          ? getBatteryEntryRouteFromSequence(started.batteryStepSequence)
          : `/audit/${AUDIT_STEPS[0]?.slug ?? "s01"}`;
      ensureBatteryProfSbRouteCookie(entryRoute);
      router.push(entryRoute);
      return;
    }
    ensureBatteryProfSbRouteCookie(continueRoute);
    router.push(continueRoute);
  }

  function handleExit(): void {
    clearValidatedAccess();
    router.replace("/");
  }

  return (
    <StepLayout>
      <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2">
        <div className={`w-full max-w-[860px] px-8 py-8 ${stepSurfaceCardClass}`}>
          <h1 className={stepSectionTitleClass}>Здравствуйте!</h1>

          <div className={`space-y-4 text-[17px] sm:text-[18px] ${stepSecondaryTextClass}`}>
            <p>
              Сейчас Вам предстоит пройти тестирование на платформе{" "}
              <strong>«Профиль Успеха»</strong>. Общее время на прохождение всех тестов
              составляет до 2 часов. Тесты имеют разную направленность и служат опорной
              базой для менеджера по работе с персоналом при составлении программ адаптации
              и развития.
            </p>
            <p>
              Перед началом каждого теста Вам будет предоставлено описание с условиями
              прохождения и пример прохождения, который поможет лучше понять суть тестовых
              вопросов. <strong>Большая часть тестов имеет ограничение по времени.</strong>{" "}
              При прохождении тестов, которые учитывают временные ограничения, в верхнем
              правом углу Вы будете видеть таймер. Общее время прохождения тестов нигде не
              отражается и время не суммируется, так как часть тестов не имеет ограничения
              по времени.
            </p>
            <p>
              Читайте условия внимательно, так как возможности вернуться к ним у Вас может
              не быть. Время на ознакомление с условиями прохождения тестов не
              ограничивается. После прочтения условий и нажатия кнопки «Далее» запускается
              таймер, который не остановить даже нажимая «Назад» в браузере.
            </p>
            <p className="font-extrabold text-red-700">
              Категорически запрещается пользоваться кнопкой «Назад» Вашего браузера, иначе
              могут возникнуть сбои, вернуться таким образом назад и пройти все заново не
              получится.
            </p>
            <p>
              В случае, если при прохождении тестирования Вам необходимо прерваться, лучше
              это сделать во время просмотра условий прохождения или описания теста. Вы
              можете прерваться несколько раз или перенести продолжение тестирования на
              следующий день. Для продолжения тестирования необходимо будет снова зайти на
              сайт и ввести Ваш код доступа.
            </p>
            {proctorRequired ? (
              <p>
                Для контроля добросовестного прохождения используется камера и
                микрофон: фиксируются посторонние шумы и отсутствие лица / несколько лиц в
                кадре. Результаты попадут в отчёт по нарушениям для HR.
              </p>
            ) : null}
            <p>Желаем удачи!</p>
          </div>

          {!isReturningSession && !skipNamePrompt ? (
            <div className="mt-8 rounded-2xl border border-black/10 bg-white/80 p-5 sm:p-6">
              <h2 className="mb-3 text-[18px] font-extrabold text-[#3A3A3A]">
                Представьтесь
              </h2>
              <p className={`mb-4 text-[15px] ${stepSecondaryTextClass}`}>
                Имя и фамилия нужны, чтобы менеджер по работе с персоналом смог собрать
                индивидуальный отчёт по результатам тестирования и сопоставить его с
                Вашими предыдущими прохождениями (если они есть).
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[14px] font-semibold text-[#5F5E5E]">
                    Имя
                  </span>
                  <input
                    type="text"
                    autoComplete="given-name"
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    maxLength={80}
                    placeholder="Например, Иван"
                    className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-[15px] text-[#3A3A3A] outline-none transition focus:border-[#00B596] focus:ring-2 focus:ring-[#00B596]/30"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[14px] font-semibold text-[#5F5E5E]">
                    Фамилия
                  </span>
                  <input
                    type="text"
                    autoComplete="family-name"
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    maxLength={80}
                    placeholder="Например, Иванов"
                    className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-[15px] text-[#3A3A3A] outline-none transition focus:border-[#00B596] focus:ring-2 focus:ring-[#00B596]/30"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {proctorRequired ? <ProctorIntroGate /> : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" onClick={handleExit} className="min-w-[160px]">
              Выйти
            </Button>
            <Button
              onClick={handleStart}
              disabled={startDisabled}
              className={`${stepNavPrimaryButtonClass} min-w-[260px]`}
            >
              {continueLabel}
            </Button>
          </div>
          {proctorRequired && !proctorReady && canStart ? (
            <p className="mt-3 text-[14px] font-medium text-amber-900" role="status">
              Сначала разрешите камеру и микрофон — кнопка «{continueLabel}» станет активной.
            </p>
          ) : null}
        </div>
      </div>
    </StepLayout>
  );
}
