"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildAuditAssesseeKey } from "@/lib/audit/auditAssesseeKey";
import {
  ATTESTATION_ANSWERABLE_COUNT,
  createEmptyAttestationAnswers,
  findFirstIncompleteAttestationBlockIndex,
  isAttestationComplete,
  type AttestationAnswers,
} from "@/lib/attestation/attestationQuestions";
import { queueAttestationAnswersSync } from "@/lib/attestation/syncAttestationAnswersClient";
import { clientSessionRef, screeningClientLog } from "@/lib/logging/screeningClientLog";
import { generateSessionId } from "@/lib/sessionId";
import { getFormPersistStateStorage } from "@/store/formPersistStorage";

export type AttestationSubmissionStatus = "idle" | "submitting" | "submitted" | "error";

export type AttestationFormStore = {
  sessionId: string | null;
  firstName: string;
  lastName: string;
  personalDataConsent: boolean;
  consentRecordedAt: string | null;
  answers: AttestationAnswers;
  currentBlockIndex: number;
  accessCodeSnapshot: string | null;
  submissionStatus: AttestationSubmissionStatus;
  submitError: string | null;

  beginAttestationSession: () => void;
  setPersonalDataConsent: (consent: boolean) => void;
  setAccessCodeSnapshot: (code: string) => void;
  setAttestationAssesseeName: (firstName: string, lastName: string) => void;
  setAttestationAnswer: (questionId: string, value: number | string) => void;
  setCurrentBlockIndex: (index: number) => void;
  submitAttestation: (accessCodeFallback?: string | null) => Promise<void>;
  leaveAttestationSession: () => void;
  resetAttestationAfterFinish: () => void;
};

export const useAttestationFormStore = create<AttestationFormStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      firstName: "",
      lastName: "",
      personalDataConsent: false,
      consentRecordedAt: null,
      answers: createEmptyAttestationAnswers(),
      currentBlockIndex: 0,
      accessCodeSnapshot: null,
      submissionStatus: "idle",
      submitError: null,

      beginAttestationSession: () => {
        const state = get();
        set({
          sessionId: state.sessionId ?? generateSessionId(),
          currentBlockIndex: findFirstIncompleteAttestationBlockIndex(state.answers),
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

      setAttestationAssesseeName: (firstName, lastName) => {
        set({ firstName: firstName.trim(), lastName: lastName.trim() });
      },

      setAttestationAnswer: (questionId, value) => {
        set((state) => ({
          answers: { ...state.answers, [questionId]: value },
        }));
        queueAttestationAnswersSync();
      },

      setCurrentBlockIndex: (index) => {
        set({ currentBlockIndex: Math.max(0, Math.min(6, index)) });
      },

      submitAttestation: async (accessCodeFallback) => {
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
        if (!isAttestationComplete(state.answers)) {
          set({
            submissionStatus: "error",
            submitError: `Заполните все ${String(ATTESTATION_ANSWERABLE_COUNT)} пунктов.`,
          });
          return;
        }

        set({ submissionStatus: "submitting", submitError: null });
        const sessionRef = clientSessionRef(state.sessionId);

        try {
          const res = await fetch("/api/attestation/submit", {
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
            screeningClientLog("attestation_submit_failed", { sessionRef });
            set({
              submissionStatus: "error",
              submitError: body.error ?? "Не удалось сохранить ответы.",
            });
            return;
          }
          screeningClientLog("attestation_submit_ok", { sessionRef });
          set({ submissionStatus: "submitted", submitError: null });
        } catch {
          screeningClientLog("attestation_submit_network_error", { sessionRef });
          set({
            submissionStatus: "error",
            submitError: "Сеть недоступна. Попробуйте ещё раз.",
          });
        }
      },

      leaveAttestationSession: () => {
        set({
          sessionId: null,
          personalDataConsent: false,
          consentRecordedAt: null,
          answers: createEmptyAttestationAnswers(),
          currentBlockIndex: 0,
          accessCodeSnapshot: null,
          submissionStatus: "idle",
          submitError: null,
        });
      },

      resetAttestationAfterFinish: () => {
        set({
          sessionId: null,
          firstName: "",
          lastName: "",
          personalDataConsent: false,
          consentRecordedAt: null,
          answers: createEmptyAttestationAnswers(),
          currentBlockIndex: 0,
          accessCodeSnapshot: null,
          submissionStatus: "idle",
          submitError: null,
        });
      },
    }),
    {
      name: "attestation-form-store-v1",
      storage: createJSONStorage(getFormPersistStateStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        firstName: state.firstName,
        lastName: state.lastName,
        personalDataConsent: state.personalDataConsent,
        consentRecordedAt: state.consentRecordedAt,
        answers: state.answers,
        currentBlockIndex: state.currentBlockIndex,
        accessCodeSnapshot: state.accessCodeSnapshot,
        submissionStatus: state.submissionStatus,
        submitError: state.submitError,
      }),
    }
  )
);
