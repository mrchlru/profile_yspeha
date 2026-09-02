"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createEmptyGerchikovStep2Data,
  type GerchikovStep2Data,
} from "@/lib/gerchikov/step2Types";
import {
  createEmptyKotStep1Data,
  type KotQuestionKey,
  type KotStep1Data,
} from "@/lib/kot/step1Types";
import { getFormPersistStateStorage } from "@/store/formPersistStorage";
import { debouncedBackgroundSync } from "@/lib/sync/debouncedBackgroundSync";
import { queueScreeningStepSync } from "@/lib/screening/syncScreeningStepClient";
import { clientSessionRef, screeningClientLog } from "@/lib/logging/screeningClientLog";
import {
  getStep1AnsweredCount,
  getStep2AnsweredCount,
  getStep3AnsweredCount,
  getStep4AnsweredCount,
} from "@/lib/progress";
import { isFullScreeningPayloadComplete } from "@/lib/validation/stepCompletion";
import type { TestKind } from "@/lib/access/testKinds";
import { TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { generateSessionId } from "@/lib/sessionId";
import { stopProctorMediaStream } from "@/lib/proctor/proctorMediaStream";
import {
  createEmptyStep4Data,
  type Step4Data as ExpandedStep4Data,
} from "@/lib/step4/step4Types";

/** Шаг 1: официальный КОТ (50 заданий), ответы строками. */
export type Step1Data = KotStep1Data;

/** Опросник мотивации (методика Герчикова), шаг 2. */
export type Step2Data = GerchikovStep2Data;

export type LikertAnswer =
  | "fully_agree"
  | "agree"
  | "neutral"
  | "disagree"
  | "fully_disagree";

export type Step3Data = {
  q1: LikertAnswer | null;
  q2: LikertAnswer | null;
  q3: LikertAnswer | null;
  q4: LikertAnswer | null;
  q5: LikertAnswer | null;
  q6: LikertAnswer | null;
  q7: LikertAnswer | null;
  q8: LikertAnswer | null;
  q9: LikertAnswer | null;
  q10: LikertAnswer | null;
};

/**
 * Расширенная анкета: личные данные, образование, опыт работы, языки и пр.
 * Структура описана в lib/step4/step4Types.ts.
 */
export type Step4Data = ExpandedStep4Data;

export type SubmissionStatus = "idle" | "submitting" | "submitted" | "error";

export type SubmitPayload = {
  sessionId: string;
  accessCode: string;
  profileName: string;
  personalDataConsent: boolean;
  /** ISO 8601 (UTC), момент установки галочки согласия на intro. */
  consentRecordedAt: string;
  step1Data: Step1Data;
  step2Data: Step2Data;
  step3Data: Step3Data;
  step4Data: Step4Data;
};

type FormStore = {
  /** Активная сессия прохождения теста; создаётся при переходе с intro на шаг 1. */
  sessionId: string | null;
  profileName: string;
  personalDataConsent: boolean;
  /** ISO 8601 (UTC), выставляется при personalDataConsent === true, сбрасывается при снятии галочки. */
  consentRecordedAt: string | null;
  /**
   * ISO 8601 (UTC): момент нажатия «СТАРТ» на шаге КОТ; до этого ответы недоступны.
   * Таймер 20 минут отсчитывается от этого момента.
   */
  kotTimerStartedAt: string | null;
  step1Data: Step1Data;
  step2Data: Step2Data;
  step3Data: Step3Data;
  step4Data: Step4Data;

  /** Код приглашения после успешной проверки на сервере. */
  validatedAccessCode: string | null;
  /** Какой тест открыт по этому коду. */
  activeTestKind: TestKind | null;
  /** DEV-режим приглашения (панель шагов, текстовый отчёт). */
  activeInviteDevMode: boolean;
  /** Имя и фамилия из карточки приглашения (если заданы при создании кода). */
  inviteCandidateFirstName: string | null;
  inviteCandidateLastName: string | null;

  /** Камера и микрофон разрешены на intro (все батареи с прокторингом). */
  proctorMediaGranted: boolean;

  submissionStatus: SubmissionStatus;
  submitError: string | null;

  setProfileName: (name: string) => void;
  setPersonalDataConsent: (consent: boolean) => void;
  setStep1Data: (data: Step1Data) => void;
  /** Одно поле КОТ без замыкания на весь step1Data (удобно для memo-карточек). */
  patchStep1Answer: (key: KotQuestionKey, value: string) => void;
  setStep2Data: (data: Step2Data) => void;
  patchStep2Answer: (questionId: string, value: string | ReadonlyArray<string>) => void;
  setStep3Data: (data: Step3Data) => void;
  setStep4Data: (data: Step4Data) => void;

  /** Удаляет ответы анкеты из памяти и persisted state (после успешной отправки). */
  clearSensitiveFormData: () => void;

  /** Новая сессия и сброс ответов — при нажатии «Продолжить» на intro. */
  beginTestSession: () => void;
  /** Завершить сессию на клиенте после успешной отправки (ответы остаются для экрана «Спасибо»). */
  closeSessionAfterSubmit: () => void;
  /** Выход из теста: сброс сессии и ответов; имя и согласие сохраняются. */
  leaveTestSession: () => void;
  /** Полный сброс после завершения (кнопка «На главную»). */
  resetAfterTestFlow: () => void;

  setValidatedAccess: (
    code: string,
    testKind: TestKind,
    options?: {
      devMode?: boolean;
      candidateFirstName?: string | null;
      candidateLastName?: string | null;
    }
  ) => void;
  clearValidatedAccess: () => void;
  /** Фиксирует успешный запрос камеры/микрофона на intro. */
  setProctorMediaGranted: (granted: boolean) => void;

  /** Запуск отсчёта 20 минут для КОТ (после прочтения инструкций). */
  startKotTimer: () => void;

  submitData: () => Promise<void>;
};

const defaultStep1Data: Step1Data = createEmptyKotStep1Data();

const defaultStep2Data: Step2Data = createEmptyGerchikovStep2Data();

const defaultStep3Data: Step3Data = {
  q1: null,
  q2: null,
  q3: null,
  q4: null,
  q5: null,
  q6: null,
  q7: null,
  q8: null,
  q9: null,
  q10: null,
};

function defaultStep4Data(): Step4Data {
  return createEmptyStep4Data();
}

function resetStepAnswers(): Pick<
  FormStore,
  "step1Data" | "step2Data" | "step3Data" | "step4Data"
> {
  return {
    step1Data: { ...defaultStep1Data },
    step2Data: { ...defaultStep2Data },
    step3Data: { ...defaultStep3Data },
    step4Data: defaultStep4Data(),
  };
}

export const useFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      profileName: "",
      personalDataConsent: false,
      consentRecordedAt: null,
      kotTimerStartedAt: null,
      step1Data: defaultStep1Data,
      step2Data: defaultStep2Data,
      step3Data: defaultStep3Data,
      step4Data: defaultStep4Data(),

      validatedAccessCode: null,
      activeTestKind: null,
      activeInviteDevMode: false,
      inviteCandidateFirstName: null,
      inviteCandidateLastName: null,

      proctorMediaGranted: false,

      submissionStatus: "idle",
      submitError: null,

      setProfileName: (name) => set({ profileName: name }),
      setPersonalDataConsent: (consent) =>
        set({
          personalDataConsent: consent,
          consentRecordedAt: consent ? new Date().toISOString() : null,
        }),
      setStep1Data: (data) => set({ step1Data: data }),
      patchStep1Answer: (key, value) =>
        set((state) => ({
          step1Data: { ...state.step1Data, [key]: value },
        })),
      setStep2Data: (data) => set({ step2Data: data }),
      patchStep2Answer: (questionId, value) =>
        set((state) => ({
          step2Data: { ...state.step2Data, [questionId]: value },
        })),
      setStep3Data: (data) => set({ step3Data: data }),
      setStep4Data: (data) => {
        set({ step4Data: data });
        debouncedBackgroundSync("screening-step4-draft", () => {
          queueScreeningStepSync(4);
        });
      },

      setValidatedAccess: (code, testKind, options) =>
        set({
          validatedAccessCode: code,
          activeTestKind: testKind,
          activeInviteDevMode: options?.devMode === true,
          inviteCandidateFirstName: options?.candidateFirstName?.trim() || null,
          inviteCandidateLastName: options?.candidateLastName?.trim() || null,
        }),
      clearValidatedAccess: () =>
        set({
          validatedAccessCode: null,
          activeTestKind: null,
          activeInviteDevMode: false,
          inviteCandidateFirstName: null,
          inviteCandidateLastName: null,
        }),

      setProctorMediaGranted: (granted) => set({ proctorMediaGranted: granted }),

      clearSensitiveFormData: () =>
        set({
          step1Data: { ...defaultStep1Data },
          step2Data: { ...defaultStep2Data },
          step3Data: { ...defaultStep3Data },
          step4Data: defaultStep4Data(),
          kotTimerStartedAt: null,
        }),

      beginTestSession: () => {
        const sessionId = generateSessionId();
        screeningClientLog("session_begin", {
          sessionRef: clientSessionRef(sessionId) ?? "none",
        });
        set({
          sessionId,
          ...resetStepAnswers(),
          kotTimerStartedAt: null,
          submissionStatus: "idle",
          submitError: null,
        });
      },

      closeSessionAfterSubmit: () => set({ sessionId: null }),

      leaveTestSession: () => {
        const prevId = get().sessionId;
        screeningClientLog("session_leave", {
          sessionRef: clientSessionRef(prevId) ?? "none",
        });
        set({
          sessionId: null,
          ...resetStepAnswers(),
          kotTimerStartedAt: null,
          submissionStatus: "idle",
          submitError: null,
        });
      },

      resetAfterTestFlow: () => {
        const prevId = get().sessionId;
        screeningClientLog("session_reset_after_flow", {
          sessionRef: clientSessionRef(prevId) ?? "none",
        });
        stopProctorMediaStream();
        set({
          sessionId: null,
          ...resetStepAnswers(),
          kotTimerStartedAt: null,
          submissionStatus: "idle",
          submitError: null,
          validatedAccessCode: null,
          activeTestKind: null,
          activeInviteDevMode: false,
          inviteCandidateFirstName: null,
          inviteCandidateLastName: null,
          proctorMediaGranted: false,
        });
      },

      startKotTimer: () => set({ kotTimerStartedAt: new Date().toISOString() }),

      submitData: async () => {
        const state = get();
        const sessionRef = clientSessionRef(state.sessionId) ?? "none";
        if (
          state.submissionStatus === "submitting" ||
          state.submissionStatus === "submitted"
        ) {
          screeningClientLog("submit_skipped_already_final", {
            sessionRef,
            status: state.submissionStatus,
          });
          return;
        }

        if (!state.sessionId) {
          screeningClientLog("submit_blocked_no_session", { sessionRef: "none" });
          set({
            submissionStatus: "error",
            submitError: "Сессия не найдена. Начните тест с экрана ввода имени.",
          });
          return;
        }

        const accessCode = state.validatedAccessCode?.trim() ?? "";
        if (
          accessCode.length < 8 ||
          state.activeTestKind !== TEST_KIND_SCREENING
        ) {
          screeningClientLog("submit_blocked_no_access", { sessionRef });
          set({
            submissionStatus: "error",
            submitError:
              "Нет действующего кода скрининга. Вернитесь на главную и введите код приглашения.",
          });
          return;
        }

        if (
          !state.consentRecordedAt ||
          state.consentRecordedAt.trim().length === 0
        ) {
          screeningClientLog("submit_blocked_no_consent", { sessionRef });
          set({
            submissionStatus: "error",
            submitError:
              "Не зафиксировано согласие с политикой. Вернитесь на экран ввода имени и примите политику.",
          });
          return;
        }

        if (
          !isFullScreeningPayloadComplete(
            state.step1Data,
            state.step2Data,
            state.step3Data,
            state.step4Data
          )
        ) {
          screeningClientLog("submit_blocked_incomplete", {
            sessionRef,
            step1Answered: getStep1AnsweredCount(state.step1Data),
            step2Answered: getStep2AnsweredCount(state.step2Data),
            step3Answered: getStep3AnsweredCount(state.step3Data),
            step4Answered: getStep4AnsweredCount(state.step4Data),
          });
          set({
            submissionStatus: "error",
            submitError: "Анкета заполнена не полностью.",
          });
          return;
        }

        set({ submissionStatus: "submitting", submitError: null });

        const payload: SubmitPayload = {
          sessionId: state.sessionId,
          accessCode,
          profileName: state.profileName,
          personalDataConsent: state.personalDataConsent,
          consentRecordedAt: state.consentRecordedAt,
          step1Data: state.step1Data,
          step2Data: state.step2Data,
          step3Data: state.step3Data,
          step4Data: state.step4Data,
        };

        screeningClientLog("submit_fetch_start", {
          sessionRef,
        });

        const fetchStarted =
          typeof performance !== "undefined" ? performance.now() : Date.now();

        try {
          const response = await fetch("/api/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const durationMs =
            typeof performance !== "undefined"
              ? Math.round(performance.now() - fetchStarted)
              : 0;

          screeningClientLog("submit_fetch_done", {
            sessionRef,
            httpStatus: response.status,
            ok: response.ok,
            durationMs,
          });

          if (!response.ok) {
            let message = `Ошибка ${String(response.status)}`;
            try {
              const body = (await response.json()) as { error?: string };
              if (body.error) {
                message = body.error;
              }
            } catch {
              /* игнорируем невалидный JSON */
            }
            screeningClientLog("submit_server_error", {
              sessionRef,
              httpStatus: response.status,
            });
            throw new Error(message);
          }

          screeningClientLog("submit_success_client", { sessionRef, durationMs });
          set({ submissionStatus: "submitted" });
          get().clearSensitiveFormData();
          get().closeSessionAfterSubmit();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Неизвестная ошибка";
          screeningClientLog("submit_client_exception", {
            sessionRef,
            errorName: error instanceof Error ? error.name : "unknown",
          });
          set({ submissionStatus: "error", submitError: message });
        }
      },
    }),
    {
      name: "profile-uspese-form-v13-anketa-expanded",
      storage: createJSONStorage(getFormPersistStateStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        validatedAccessCode: state.validatedAccessCode,
        activeTestKind: state.activeTestKind,
        activeInviteDevMode: state.activeInviteDevMode,
        inviteCandidateFirstName: state.inviteCandidateFirstName,
        inviteCandidateLastName: state.inviteCandidateLastName,
        proctorMediaGranted: state.proctorMediaGranted,
        profileName: state.profileName,
        personalDataConsent: state.personalDataConsent,
        consentRecordedAt: state.consentRecordedAt,
        kotTimerStartedAt: state.kotTimerStartedAt,
        step1Data: state.step1Data,
        step2Data: state.step2Data,
        step3Data: state.step3Data,
        step4Data: state.step4Data,
        submissionStatus: state.submissionStatus,
        submitError: state.submitError,
      }),
      skipHydration: true,
    }
  )
);

