"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import {
  countSpecialistScreeningAnswered,
  createEmptySpecialistScreeningAnswers,
  isSpecialistScreeningComplete,
  SPECIALIST_SCREENING_QUESTION_COUNT,
  type SpecialistScreeningAnswers,
  type SpecialistScreeningOptionId,
} from "@/lib/specialistScreening/specialistScreeningQuestions";
import { queueSpecialistScreeningAnswersSync } from "@/lib/specialistScreening/syncSpecialistScreeningAnswersClient";
import { clientSessionRef, screeningClientLog } from "@/lib/logging/screeningClientLog";
import { generateSessionId } from "@/lib/sessionId";
import { getFormPersistStateStorage } from "@/store/formPersistStorage";

export type SpecialistScreeningSubmissionStatus =
  | "idle"
  | "submitting"
  | "submitted"
  | "error";

export type SpecialistScreeningFormStore = {
  sessionId: string | null;
  firstName: string;
  lastName: string;
  personalDataConsent: boolean;
  consentRecordedAt: string | null;
  answers: SpecialistScreeningAnswers;
  accessCodeSnapshot: string | null;
  submissionStatus: SpecialistScreeningSubmissionStatus;
  submitError: string | null;

  beginSpecialistScreeningSession: () => void;
  setPersonalDataConsent: (consent: boolean) => void;
  setAccessCodeSnapshot: (code: string) => void;
  setSpecialistScreeningAssesseeName: (firstName: string, lastName: string) => void;
  setSpecialistScreeningAnswer: (
    questionId: string,
    value: SpecialistScreeningOptionId
  ) => void;
  submitSpecialistScreening: (accessCodeFallback?: string | null) => Promise<void>;
  leaveSpecialistScreeningSession: () => void;
  resetSpecialistScreeningAfterFinish: () => void;
};

export const useSpecialistScreeningFormStore = create<SpecialistScreeningFormStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      firstName: "",
      lastName: "",
      personalDataConsent: false,
      consentRecordedAt: null,
      answers: createEmptySpecialistScreeningAnswers(),
      accessCodeSnapshot: null,
      submissionStatus: "idle",
      submitError: null,

      beginSpecialistScreeningSession: () => {
        const state = get();
        set({
          sessionId: state.sessionId ?? generateSessionId(),
          answers: state.answers,
        });
      },

      setPersonalDataConsent: (consent) => {
        set({
          personalDataConsent: consent,
          consentRecordedAt: consent ? new Date().toISOString() : null,
        });
      },

      setAccessCodeSnapshot: (code) => {
        set({ accessCodeSnapshot: code.trim() });
      },

      setSpecialistScreeningAssesseeName: (firstName, lastName) => {
        set({ firstName: firstName.trim(), lastName: lastName.trim() });
      },

      setSpecialistScreeningAnswer: (questionId, value) => {
        set((state) => ({
          answers: { ...state.answers, [questionId]: value },
        }));
        queueSpecialistScreeningAnswersSync();
      },

      submitSpecialistScreening: async (accessCodeFallback) => {
        const state = get();
        const accessCode = (accessCodeFallback ?? state.accessCodeSnapshot ?? "").trim();
        const assessee = buildAuditAssesseeKey({
          firstName: state.firstName,
          lastName: state.lastName,
        });

        if (!state.sessionId || !accessCode || !assessee) {
          set({
            submissionStatus: "error",
            submitError: "Не хватает данных для отправки. Начните тест заново.",
          });
          return;
        }
        if (!state.personalDataConsent || !state.consentRecordedAt) {
          set({
            submissionStatus: "error",
            submitError: "Подтвердите согласие на обработку данных.",
          });
          return;
        }
        if (!isSpecialistScreeningComplete(state.answers)) {
          set({
            submissionStatus: "error",
            submitError: `Заполните все ${String(SPECIALIST_SCREENING_QUESTION_COUNT)} вопросов.`,
          });
          return;
        }

        set({ submissionStatus: "submitting", submitError: null });
        const sessionRef = clientSessionRef(state.sessionId);

        try {
          const res = await fetch("/api/specialist-screening/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: state.sessionId,
              accessCode,
              firstName: assessee.firstNameDisplay,
              lastName: assessee.lastNameDisplay,
              personalDataConsent: true,
              consentRecordedAt: state.consentRecordedAt,
              answers: state.answers,
            }),
          });
          const body = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok || !body.ok) {
            screeningClientLog("specialist_screening_submit_failed", { sessionRef });
            set({
              submissionStatus: "error",
              submitError: body.error ?? "Не удалось сохранить ответы.",
            });
            return;
          }
          screeningClientLog("specialist_screening_submit_ok", { sessionRef });
          set({ submissionStatus: "submitted", submitError: null });
        } catch {
          screeningClientLog("specialist_screening_submit_network_error", { sessionRef });
          set({
            submissionStatus: "error",
            submitError: "Сеть недоступна. Попробуйте ещё раз.",
          });
        }
      },

      leaveSpecialistScreeningSession: () => {
        set({
          sessionId: null,
          personalDataConsent: false,
          consentRecordedAt: null,
          answers: createEmptySpecialistScreeningAnswers(),
          accessCodeSnapshot: null,
          submissionStatus: "idle",
          submitError: null,
        });
      },

      resetSpecialistScreeningAfterFinish: () => {
        set({
          sessionId: null,
          firstName: "",
          lastName: "",
          personalDataConsent: false,
          consentRecordedAt: null,
          answers: createEmptySpecialistScreeningAnswers(),
          accessCodeSnapshot: null,
          submissionStatus: "idle",
          submitError: null,
        });
      },
    }),
    {
      name: "specialist-screening-form-store-v1",
      storage: createJSONStorage(getFormPersistStateStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        firstName: state.firstName,
        lastName: state.lastName,
        personalDataConsent: state.personalDataConsent,
        consentRecordedAt: state.consentRecordedAt,
        answers: state.answers,
        accessCodeSnapshot: state.accessCodeSnapshot,
        submissionStatus: state.submissionStatus,
        submitError: state.submitError,
      }),
    }
  )
);

/**
 * Число заполненных ответов.
 */
export function getSpecialistScreeningAnsweredCount(
  answers: SpecialistScreeningAnswers
): number {
  return countSpecialistScreeningAnswered(answers);
}
