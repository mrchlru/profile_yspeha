"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import {
  countMaslachBurnoutAnswered,
  createEmptyMaslachBurnoutAnswers,
  isMaslachBurnoutComplete,
  MASLACH_BURNOUT_QUESTION_COUNT,
  type MaslachBurnoutAnswers,
  type MaslachBurnoutOptionId,
} from "@/lib/burnout/maslachBurnoutQuestions";
import { clientSessionRef, screeningClientLog } from "@/lib/logging/screeningClientLog";
import { generateSessionId } from "@/lib/sessionId";
import { getFormPersistStateStorage } from "@/store/formPersistStorage";
import { queueBurnoutAnswersSync } from "@/lib/burnout/syncBurnoutAnswersClient";

export type BurnoutSubmissionStatus = "idle" | "submitting" | "submitted" | "error";

export type BurnoutFormStore = {
  sessionId: string | null;
  firstName: string;
  lastName: string;
  personalDataConsent: boolean;
  consentRecordedAt: string | null;
  answers: MaslachBurnoutAnswers;
  accessCodeSnapshot: string | null;
  submissionStatus: BurnoutSubmissionStatus;
  submitError: string | null;

  beginBurnoutSession: () => void;
  setPersonalDataConsent: (consent: boolean) => void;
  setAccessCodeSnapshot: (code: string) => void;
  setBurnoutAssesseeName: (firstName: string, lastName: string) => void;
  setBurnoutAnswer: (questionId: string, value: MaslachBurnoutOptionId) => void;
  submitBurnout: (accessCodeFallback?: string | null) => Promise<void>;
  leaveBurnoutSession: () => void;
  resetBurnoutAfterFinish: () => void;
};

export const useBurnoutFormStore = create<BurnoutFormStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      firstName: "",
      lastName: "",
      personalDataConsent: false,
      consentRecordedAt: null,
      answers: createEmptyMaslachBurnoutAnswers(),
      accessCodeSnapshot: null,
      submissionStatus: "idle",
      submitError: null,

      beginBurnoutSession: () => {
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

      setBurnoutAssesseeName: (firstName, lastName) => {
        set({ firstName: firstName.trim(), lastName: lastName.trim() });
      },

      setBurnoutAnswer: (questionId, value) => {
        set((state) => ({
          answers: { ...state.answers, [questionId]: value },
        }));
        queueBurnoutAnswersSync();
      },

      submitBurnout: async (accessCodeFallback) => {
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
        if (!isMaslachBurnoutComplete(state.answers)) {
          set({
            submissionStatus: "error",
            submitError: `Заполните все ${String(MASLACH_BURNOUT_QUESTION_COUNT)} вопросов.`,
          });
          return;
        }

        set({ submissionStatus: "submitting", submitError: null });
        const sessionRef = clientSessionRef(state.sessionId);

        try {
          const res = await fetch("/api/burnout/submit", {
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
            screeningClientLog("burnout_submit_failed", { sessionRef });
            set({
              submissionStatus: "error",
              submitError: body.error ?? "Не удалось сохранить ответы.",
            });
            return;
          }
          screeningClientLog("burnout_submit_ok", { sessionRef });
          set({ submissionStatus: "submitted", submitError: null });
        } catch {
          screeningClientLog("burnout_submit_network_error", { sessionRef });
          set({
            submissionStatus: "error",
            submitError: "Сеть недоступна. Попробуйте ещё раз.",
          });
        }
      },

      leaveBurnoutSession: () => {
        set({
          sessionId: null,
          personalDataConsent: false,
          consentRecordedAt: null,
          answers: createEmptyMaslachBurnoutAnswers(),
          accessCodeSnapshot: null,
          submissionStatus: "idle",
          submitError: null,
        });
      },

      resetBurnoutAfterFinish: () => {
        set({
          sessionId: null,
          firstName: "",
          lastName: "",
          personalDataConsent: false,
          consentRecordedAt: null,
          answers: createEmptyMaslachBurnoutAnswers(),
          accessCodeSnapshot: null,
          submissionStatus: "idle",
          submitError: null,
        });
      },
    }),
    {
      name: "burnout-form-store-v1",
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

export function getBurnoutAnsweredCount(answers: MaslachBurnoutAnswers): number {
  return countMaslachBurnoutAnswered(answers);
}
