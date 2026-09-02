"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import {
  createEmptyProfSbEducationAnswers,
  isProfSbEducationComplete,
  type ProfSbEducationAnswers,
} from "@/lib/profSbEducation/profSbEducationTypes";
import { clientSessionRef, screeningClientLog } from "@/lib/logging/screeningClientLog";
import { generateSessionId } from "@/lib/sessionId";
import { getFormPersistStateStorage } from "@/store/formPersistStorage";
import { queueProfSbEducationAnswersSync } from "@/lib/profSbEducation/syncProfSbEducationAnswersClient";

export type ProfSbEducationSubmissionStatus = "idle" | "submitting" | "submitted" | "error";

export type ProfSbEducationFormStore = {
  sessionId: string | null;
  firstName: string;
  lastName: string;
  personalDataConsent: boolean;
  consentRecordedAt: string | null;
  answers: ProfSbEducationAnswers;
  accessCodeSnapshot: string | null;
  submissionStatus: ProfSbEducationSubmissionStatus;
  submitError: string | null;

  beginProfSbEducationSession: () => void;
  setPersonalDataConsent: (consent: boolean) => void;
  setAccessCodeSnapshot: (code: string) => void;
  setProfSbEducationAssesseeName: (firstName: string, lastName: string) => void;
  setProfSbEducationAnswers: (answers: ProfSbEducationAnswers) => void;
  submitProfSbEducation: (accessCodeFallback?: string | null) => Promise<void>;
  leaveProfSbEducationSession: () => void;
  resetProfSbEducationAfterFinish: () => void;
};

export const useProfSbEducationFormStore = create<ProfSbEducationFormStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      firstName: "",
      lastName: "",
      personalDataConsent: false,
      consentRecordedAt: null,
      answers: createEmptyProfSbEducationAnswers(),
      accessCodeSnapshot: null,
      submissionStatus: "idle",
      submitError: null,

      beginProfSbEducationSession: () => {
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

      setProfSbEducationAssesseeName: (firstName, lastName) => {
        set({ firstName: firstName.trim(), lastName: lastName.trim() });
      },

      setProfSbEducationAnswers: (answers) => {
        set({ answers });
        queueProfSbEducationAnswersSync();
      },

      submitProfSbEducation: async (accessCodeFallback) => {
        const state = get();
        const accessCode = (accessCodeFallback ?? state.accessCodeSnapshot ?? "").trim();
        const assessee = buildAuditAssesseeKey({
          firstName: state.firstName,
          lastName: state.lastName,
        });

        if (!state.sessionId || !accessCode || !assessee) {
          set({
            submissionStatus: "error",
            submitError: "Не хватает данных для отправки. Начните анкету заново.",
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
        if (!isProfSbEducationComplete(state.answers)) {
          set({
            submissionStatus: "error",
            submitError: "Заполните все обязательные поля анкеты.",
          });
          return;
        }

        set({ submissionStatus: "submitting", submitError: null });
        const sessionRef = clientSessionRef(state.sessionId);

        try {
          const res = await fetch("/api/prof-sb-education/submit", {
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
            screeningClientLog("prof_sb_education_submit_failed", { sessionRef });
            set({
              submissionStatus: "error",
              submitError: body.error ?? "Не удалось сохранить ответы.",
            });
            return;
          }
          screeningClientLog("prof_sb_education_submit_ok", { sessionRef });
          set({ submissionStatus: "submitted", submitError: null });
        } catch {
          screeningClientLog("prof_sb_education_submit_network_error", { sessionRef });
          set({
            submissionStatus: "error",
            submitError: "Сеть недоступна. Попробуйте ещё раз.",
          });
        }
      },

      leaveProfSbEducationSession: () => {
        set({
          sessionId: null,
          personalDataConsent: false,
          consentRecordedAt: null,
          answers: createEmptyProfSbEducationAnswers(),
          accessCodeSnapshot: null,
          submissionStatus: "idle",
          submitError: null,
        });
      },

      resetProfSbEducationAfterFinish: () => {
        set({
          sessionId: null,
          firstName: "",
          lastName: "",
          personalDataConsent: false,
          consentRecordedAt: null,
          answers: createEmptyProfSbEducationAnswers(),
          accessCodeSnapshot: null,
          submissionStatus: "idle",
          submitError: null,
        });
      },
    }),
    {
      name: "prof-sb-education-form-store-v1",
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
