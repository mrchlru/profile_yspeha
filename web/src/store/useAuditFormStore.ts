"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getFormPersistStateStorage } from "@/store/formPersistStorage";
import { AUDIT_TOTAL_STEPS } from "@/lib/audit/auditSteps";
import {
  getAuditBatteryById,
  getAuditBatteryForTestKind,
  getBatteryStepSequencePositionFromSequence,
  getBatteryTotalStepCount,
  type AuditBatteryId,
} from "@/lib/audit/auditBatteries";
import { BATTERY_PROF_SB_STEP_MARKER } from "@/lib/audit/batteryStepMarkers";
import { queueAuditStepSync } from "@/lib/audit/syncAuditAnswersClient";
import { isBatteryWithProfSbId } from "@/lib/audit/isBatteryWithProfSb";
import { setScreeningMaxStepCookie } from "@/lib/screeningProgressCookie";
import type { TestKind } from "@/lib/access/testKinds";
import { generateSessionId } from "@/lib/sessionId";
import type {
  AuditAnswerEntry,
  AuditAnswersMap,
  AuditStepAnswers,
} from "@/lib/audit/auditAnswers";
import { clientSessionRef, screeningClientLog } from "@/lib/logging/screeningClientLog";
import type { Step4Data } from "@/lib/step4/step4Types";
import { isStep4Complete } from "@/lib/validation/stepCompletion";
import { useFormStore } from "@/store/useFormStore";
import type { OdIdentityQuestionnaire } from "@/lib/identity/odIdentityTypes";

/** Статус отправки ответов аудита на `/api/audit/submit`. */
export type AuditSubmissionStatus = "idle" | "submitting" | "submitted" | "error";

/**
 * Стор формы аудита состояния. ПОЛНОСТЬЮ изолирован от стора скрининга
 * (`useFormStore`): разный persist-ключ, разные действия, разные структуры данных.
 *
 * Хранит маршрутную часть (сессия, согласие, достигнутые шаги) и ответы по
 * каждому шагу в универсальной форме `AuditAnswersMap`. Конкретные семантические
 * значения (например, `"yes" | "no"` для теста 7) типизируются на стороне
 * компонента шага — это позволяет добавлять тесты по одному без правок здесь.
 */
export type AuditFormStore = {
  /** Идентификатор сессии прохождения аудита; создаётся при нажатии «Начать тестирование». */
  sessionId: string | null;
  /** Максимальный достигнутый шаг (0 — ещё не начали; 1..AUDIT_TOTAL_STEPS — открыт соответствующий шаг). */
  maxUnlockedStep: number;
  /** Шаг, к которому пользователь успел продвинуться (для «продолжить» с того места). */
  currentStep: number;
  /** Согласие с условиями (галочка / кнопка «Перейти к тестированию»). */
  personalDataConsent: boolean;
  /** ISO 8601 (UTC) момента согласия. */
  consentRecordedAt: string | null;
  /**
   * Имя респондента (без фамилии). Запрашивается перед началом тестирования.
   * Хранится в persist, чтобы выдержать перезагрузку страницы посередине прохождения,
   * и отправляется в `/api/audit/submit` для сшивки годовых волн одного сотрудника
   * (см. `web/src/lib/audit/auditAssesseeKey.ts`).
   */
  firstName: string;
  /** Фамилия респондента; парная к `firstName`. */
  lastName: string;
  /** Ответы по всем шагам: `{ [stepIndex]: { qN: value } }`. */
  answers: AuditAnswersMap;
  /**
   * Время старта таймера для каждого шага в epoch-миллисекундах.
   * Заполняется при первом входе пользователя в фазу вопросов шага с таймером
   * и сохраняется в persist, чтобы при перезагрузке страницы отсчёт продолжался
   * с того же момента (а не сбрасывался к полному лимиту).
   */
  timerStartedAt: Record<number, number>;
  /**
   * Код доступа, зафиксированный при старте/продолжении аудита.
   * Дублирует `validatedAccessCode` из стора скрининга, чтобы отправка на
   * `/audit/finish` переживала перезагрузку страницы и сброс кода в form-store.
   */
  accessCodeSnapshot: string | null;
  /** Состояние POST `/api/audit/submit` на финальном экране. */
  submissionStatus: AuditSubmissionStatus;
  /** Текст ошибки отправки для UI финального экрана. */
  submitError: string | null;
  /** Plain-text отчёт после DEV-отправки (`/api/audit/dev-submit`). */
  devTextReport: string | null;
  /** Было ли отправлено письмо с DEV-отчётом. */
  devEmailSent: boolean | null;

  /** Активная батарея (перемешанный маршрут); `null` — полный аудит 24 шага. */
  batteryId: AuditBatteryId | null;
  /**
   * Сколько первых позиций в перемешанной последовательности батареи разблокировано
   * (1 = доступен только первый шаг в порядке прохождения).
   */
  batterySequenceUnlockedThrough: number;
  /** Порядок шагов батареи из кода доступа (фиксируется при создании приглашения). */
  batteryStepSequence: number[] | null;

  /**
   * Анкета идентичности (ОД / кадровый резерв): только в сессии браузера,
   * не отправляется на сервер и не попадает в отчёты.
   */
  odIdentityQuestionnaire: OdIdentityQuestionnaire | null;
  /** Шаги аудита, на которых уже показывали проверочный вопрос. */
  odIdentityCheckShownStepIndexes: number[];

  beginAuditSession: (testKind?: TestKind | null) => void;
  /** Сохраняет порядок прохождения батареи из ответа `/api/access/validate`. */
  setBatteryStepSequence: (sequence: number[] | null, testKind?: TestKind | null) => void;
  setPersonalDataConsent: (consent: boolean) => void;
  /** Сохраняет код доступа для последующей отправки ответов. */
  setAccessCodeSnapshot: (code: string) => void;
  /** Отправляет ответы аудита на сервер; повторяемо при ошибке. */
  submitAudit: (accessCodeFallback?: string | null) => Promise<void>;
  /** DEV: текстовый отчёт по пройденным шагам (без PDF и ИИ). */
  submitAuditDev: (accessCodeFallback?: string | null) => Promise<void>;
  /** Записывает имя/фамилию пользователя; пробелы по краям нормализуются. */
  setAuditAssesseeName: (firstName: string, lastName: string) => void;
  /** Помечает шаг как достигнутый: разблокирует его и обновляет `currentStep`. */
  markStepReached: (stepIndex: number) => void;
  /** Помечает шаг как завершённый: разблокирует следующий (если он есть). */
  markStepCompleted: (stepIndex: number) => void;
  /** Записывает один ответ внутри указанного шага. */
  setAuditAnswer: (stepIndex: number, questionId: string, value: AuditAnswerEntry) => void;
  /** Полностью заменяет блок ответов шага (например, при rehydrate). */
  replaceStepAnswers: (stepIndex: number, stepAnswers: AuditStepAnswers) => void;
  /** Запускает таймер шага, если он ещё не был запущен (идемпотентно). */
  startStepTimer: (stepIndex: number) => void;
  /** Удаляет сохранённый старт таймера шага (например, после завершения). */
  clearStepTimer: (stepIndex: number) => void;
  /**
   * Копирует момент старта таймера с шага `fromStepIndex` на шаг `toStepIndex`,
   * если для целевого шага таймер ещё не запускался. Используется для пары шагов,
   * у которых второй шаг продолжает обратный отсчёт первого (`joinPreviousStep`).
   */
  inheritStepTimer: (fromStepIndex: number, toStepIndex: number) => void;
  /** Сброс прогресса аудита (выход из теста). */
  leaveAuditSession: () => void;
  /** Полный сброс после завершения. */
  resetAuditAfterFinish: () => void;
  /** Сохраняет анкету идентичности (только клиентская сессия). */
  setOdIdentityQuestionnaire: (questionnaire: OdIdentityQuestionnaire) => void;
  /** Помечает шаг, на котором уже была проверка личности. */
  markOdIdentityCheckShown: (stepIndex: number) => void;
};

function _clampStep(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.floor(value);
  if (rounded < 0) {
    return 0;
  }
  if (rounded > AUDIT_TOTAL_STEPS) {
    return AUDIT_TOTAL_STEPS;
  }
  return rounded;
}

export const useAuditFormStore = create<AuditFormStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      maxUnlockedStep: 0,
      currentStep: 0,
      personalDataConsent: false,
      consentRecordedAt: null,
      firstName: "",
      lastName: "",
      answers: {},
      timerStartedAt: {},
      accessCodeSnapshot: null,
      submissionStatus: "idle",
      submitError: null,
      devTextReport: null,
      devEmailSent: null,
      batteryId: null,
      batterySequenceUnlockedThrough: 0,
      batteryStepSequence: null,
      odIdentityQuestionnaire: null,
      odIdentityCheckShownStepIndexes: [],

      beginAuditSession: (testKind) => {
        const battery = getAuditBatteryForTestKind(testKind);
        const state = get();
        set({
          sessionId: generateSessionId(),
          batteryId: battery?.id ?? state.batteryId,
          batteryStepSequence: state.batteryStepSequence,
          batterySequenceUnlockedThrough: battery ? 1 : 0,
          maxUnlockedStep: battery ? 0 : 1,
          currentStep: battery ? 0 : 1,
          answers: {},
          timerStartedAt: {},
          submissionStatus: "idle",
          submitError: null,
          devTextReport: null,
          devEmailSent: null,
        });
        if (isBatteryWithProfSbId(battery?.id)) {
          setScreeningMaxStepCookie(4);
        }
      },

      setBatteryStepSequence: (sequence, testKind) => {
        const battery = getAuditBatteryForTestKind(testKind);
        set({
          batteryStepSequence: sequence,
          batteryId: battery?.id ?? null,
        });
        if (isBatteryWithProfSbId(battery?.id)) {
          setScreeningMaxStepCookie(4);
        }
      },

      setPersonalDataConsent: (consent) =>
        set({
          personalDataConsent: consent,
          consentRecordedAt: consent ? new Date().toISOString() : null,
        }),

      setAccessCodeSnapshot: (code) =>
        set({
          accessCodeSnapshot: code.trim().length > 0 ? code.trim() : null,
        }),

      submitAudit: async (accessCodeFallback) => {
        const state = get();
        const sessionRef = clientSessionRef(state.sessionId) ?? "none";

        if (
          state.submissionStatus === "submitting" ||
          state.submissionStatus === "submitted"
        ) {
          screeningClientLog("audit_submit_skipped_already_final", {
            sessionRef,
            status: state.submissionStatus,
          });
          return;
        }

        if (!state.sessionId) {
          set({
            submissionStatus: "error",
            submitError: "Сессия не найдена. Вернитесь на экран ввода кода и начните заново.",
          });
          return;
        }

        const accessCode = (
          state.accessCodeSnapshot ??
          accessCodeFallback ??
          ""
        ).trim();
        if (accessCode.length < 8) {
          set({
            submissionStatus: "error",
            submitError:
              "Нет действующего кода доступа. Вернитесь на главную и введите код приглашения.",
          });
          return;
        }

        if (state.firstName.trim().length === 0 || state.lastName.trim().length === 0) {
          set({
            submissionStatus: "error",
            submitError: "Не указаны имя и фамилия участника.",
          });
          return;
        }

        const consent = _resolveAuditSubmitConsent({
          personalDataConsent: state.personalDataConsent,
          consentRecordedAt: state.consentRecordedAt,
          maxUnlockedStep: state.maxUnlockedStep,
          answers: state.answers,
          batteryId: state.batteryId,
          batteryStepSequence: state.batteryStepSequence,
          batterySequenceUnlockedThrough: state.batterySequenceUnlockedThrough,
        });
        if (consent === null) {
          set({
            submissionStatus: "error",
            submitError:
              "Не зафиксировано согласие на обработку данных. Вернитесь на экран аудита и начните снова.",
          });
          return;
        }

        if (!_isReadyForAuditSubmit(state)) {
          set({
            submissionStatus: "error",
            submitError: "Ответы теста не найдены или сохранены не полностью.",
          });
          return;
        }

        if (
          consent.repaired &&
          (!state.personalDataConsent || state.consentRecordedAt === null)
        ) {
          set({
            personalDataConsent: true,
            consentRecordedAt: consent.recordedAt,
          });
        }

        set({ submissionStatus: "submitting", submitError: null });
        screeningClientLog("audit_submit_fetch_start", { sessionRef });

        const fetchStarted =
          typeof performance !== "undefined" ? performance.now() : Date.now();

        try {
          const profSbPayload = _buildProfSbSubmitPayload(state);
          const response = await fetch("/api/audit/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessCode,
              sessionId: state.sessionId,
              firstName: state.firstName.trim(),
              lastName: state.lastName.trim(),
              personalDataConsent: true,
              consentRecordedAt: consent.recordedAt,
              answers: _serializeAuditAnswersForSubmit(state.answers),
              ...(profSbPayload !== null ? { step4Data: profSbPayload } : {}),
            }),
          });

          const durationMs =
            typeof performance !== "undefined"
              ? Math.round(performance.now() - fetchStarted)
              : 0;

          screeningClientLog("audit_submit_fetch_done", {
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
            throw new Error(message);
          }

          const body = (await response.json()) as { ok?: boolean };
          if (!body.ok) {
            throw new Error("Сервер не подтвердил сохранение ответов.");
          }

          screeningClientLog("audit_submit_success_client", { sessionRef, durationMs });
          set({ submissionStatus: "submitted", submitError: null });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Неизвестная ошибка";
          screeningClientLog("audit_submit_client_exception", {
            sessionRef,
            errorName: error instanceof Error ? error.name : "unknown",
          });
          set({ submissionStatus: "error", submitError: message });
        }
      },

      submitAuditDev: async (accessCodeFallback) => {
        const state = get();
        let sessionId = state.sessionId;
        if (sessionId === null) {
          sessionId = generateSessionId();
          set({
            sessionId,
            personalDataConsent: true,
            consentRecordedAt: new Date().toISOString(),
          });
        }

        const sessionRef = clientSessionRef(sessionId) ?? "none";

        if (
          state.submissionStatus === "submitting" ||
          state.submissionStatus === "submitted"
        ) {
          return;
        }

        const accessCode = (
          state.accessCodeSnapshot ??
          accessCodeFallback ??
          ""
        ).trim();
        if (accessCode.length < 8) {
          set({
            submissionStatus: "error",
            submitError: "Нет dev-кода доступа (state_audit_dev).",
          });
          return;
        }

        if (!_hasAnyAuditAnswers(state.answers)) {
          set({
            submissionStatus: "error",
            submitError: "Нет ответов ни по одному шагу.",
          });
          return;
        }

        const consentRecordedAt =
          state.consentRecordedAt ?? new Date().toISOString();
        if (!state.personalDataConsent || state.consentRecordedAt === null) {
          set({
            personalDataConsent: true,
            consentRecordedAt,
          });
        }

        set({
          submissionStatus: "submitting",
          submitError: null,
          devTextReport: null,
          devEmailSent: null,
        });
        screeningClientLog("audit_dev_submit_fetch_start", { sessionRef });

        try {
          const response = await fetch("/api/audit/dev-submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessCode,
              sessionId,
              firstName: state.firstName.trim() || undefined,
              lastName: state.lastName.trim() || undefined,
              personalDataConsent: true,
              consentRecordedAt,
              answers: _serializeAuditAnswersForSubmit(state.answers),
            }),
          });

          if (!response.ok) {
            let message = `Ошибка ${String(response.status)}`;
            try {
              const body = (await response.json()) as { error?: string };
              if (body.error) {
                message = body.error;
              }
            } catch {
              /* ignore */
            }
            throw new Error(message);
          }

          const body = (await response.json()) as {
            ok?: boolean;
            textReport?: string;
            emailSent?: boolean;
          };
          if (!body.ok || typeof body.textReport !== "string") {
            throw new Error("Сервер не вернул текстовый отчёт.");
          }

          set({
            submissionStatus: "submitted",
            submitError: null,
            devTextReport: body.textReport,
            devEmailSent: body.emailSent === true,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Неизвестная ошибка";
          set({ submissionStatus: "error", submitError: message });
        }
      },

      setAuditAssesseeName: (firstName, lastName) =>
        set({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),

      markStepReached: (stepIndex) => {
        const safe = _clampStep(stepIndex);
        const state = get();
        if (state.batteryId !== null && state.batteryStepSequence !== null) {
          const battery = getAuditBatteryById(state.batteryId);
          if (battery !== null) {
            const position = getBatteryStepSequencePositionFromSequence(
              state.batteryStepSequence,
              safe
            );
            if (position >= 0) {
              set({
                batterySequenceUnlockedThrough: Math.max(
                  state.batterySequenceUnlockedThrough,
                  position + 1
                ),
                currentStep: safe,
              });
            }
            return;
          }
        }
        set({
          maxUnlockedStep: Math.max(state.maxUnlockedStep, safe),
          currentStep: safe,
        });
      },

      markStepCompleted: (stepIndex) => {
        const safe = _clampStep(stepIndex);
        const state = get();
        if (state.batteryId !== null && state.batteryStepSequence !== null) {
          const battery = getAuditBatteryById(state.batteryId);
          if (battery !== null) {
            const position = getBatteryStepSequencePositionFromSequence(
              state.batteryStepSequence,
              safe
            );
            if (position >= 0) {
              const sequenceLength = getBatteryTotalStepCount(battery);
              set({
                batterySequenceUnlockedThrough: Math.max(
                  state.batterySequenceUnlockedThrough,
                  Math.min(position + 2, sequenceLength + 1)
                ),
                currentStep: safe,
              });
              queueAuditStepSync(safe);
            }
            return;
          }
        }
        const nextStep = _clampStep(safe + 1);
        set({
          maxUnlockedStep: Math.max(state.maxUnlockedStep, nextStep),
          currentStep: nextStep > 0 ? nextStep : state.currentStep,
        });
        queueAuditStepSync(safe);
      },

      setAuditAnswer: (stepIndex, questionId, value) => {
        const safe = _clampStep(stepIndex);
        if (safe === 0) {
          return;
        }
        set((state) => {
          const prevStep = state.answers[safe] ?? {};
          return {
            answers: {
              ...state.answers,
              [safe]: { ...prevStep, [questionId]: value },
            },
          };
        });
      },

      replaceStepAnswers: (stepIndex, stepAnswers) => {
        const safe = _clampStep(stepIndex);
        if (safe === 0) {
          return;
        }
        set((state) => ({
          answers: { ...state.answers, [safe]: { ...stepAnswers } },
        }));
      },

      startStepTimer: (stepIndex) => {
        const safe = _clampStep(stepIndex);
        if (safe === 0) {
          return;
        }
        const state = get();
        if (state.timerStartedAt[safe] !== undefined) {
          return;
        }
        set({
          timerStartedAt: { ...state.timerStartedAt, [safe]: Date.now() },
        });
      },

      clearStepTimer: (stepIndex) => {
        const safe = _clampStep(stepIndex);
        if (safe === 0) {
          return;
        }
        set((state) => {
          if (state.timerStartedAt[safe] === undefined) {
            return state;
          }
          const next = { ...state.timerStartedAt };
          delete next[safe];
          return { timerStartedAt: next };
        });
      },

      inheritStepTimer: (fromStepIndex, toStepIndex) => {
        const safeFrom = _clampStep(fromStepIndex);
        const safeTo = _clampStep(toStepIndex);
        if (safeFrom === 0 || safeTo === 0 || safeFrom === safeTo) {
          return;
        }
        const state = get();
        if (state.timerStartedAt[safeTo] !== undefined) {
          return;
        }
        const fromStartedAt = state.timerStartedAt[safeFrom];
        if (fromStartedAt === undefined) {
          return;
        }
        set({
          timerStartedAt: { ...state.timerStartedAt, [safeTo]: fromStartedAt },
        });
      },

      leaveAuditSession: () =>
        set({
          sessionId: null,
          maxUnlockedStep: 0,
          currentStep: 0,
          batteryId: null,
          batterySequenceUnlockedThrough: 0,
          batteryStepSequence: null,
          firstName: "",
          lastName: "",
          answers: {},
          timerStartedAt: {},
          accessCodeSnapshot: null,
          submissionStatus: "idle",
          submitError: null,
          devTextReport: null,
          devEmailSent: null,
          odIdentityQuestionnaire: null,
          odIdentityCheckShownStepIndexes: [],
        }),

      setOdIdentityQuestionnaire: (questionnaire) =>
        set({ odIdentityQuestionnaire: questionnaire }),

      markOdIdentityCheckShown: (stepIndex) => {
        const safe = _clampStep(stepIndex);
        if (safe === 0) {
          return;
        }
        set((state) => {
          if (state.odIdentityCheckShownStepIndexes.includes(safe)) {
            return state;
          }
          return {
            odIdentityCheckShownStepIndexes: [
              ...state.odIdentityCheckShownStepIndexes,
              safe,
            ],
          };
        });
      },

      resetAuditAfterFinish: () =>
        set({
          sessionId: null,
          maxUnlockedStep: 0,
          currentStep: 0,
          batteryId: null,
          batterySequenceUnlockedThrough: 0,
          batteryStepSequence: null,
          personalDataConsent: false,
          consentRecordedAt: null,
          firstName: "",
          lastName: "",
          answers: {},
          timerStartedAt: {},
          accessCodeSnapshot: null,
          submissionStatus: "idle",
          submitError: null,
          devTextReport: null,
          devEmailSent: null,
          odIdentityQuestionnaire: null,
          odIdentityCheckShownStepIndexes: [],
        }),
    }),
    {
      name: "audit-form-v5-od-identity",
      storage: createJSONStorage(getFormPersistStateStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        maxUnlockedStep: state.maxUnlockedStep,
        currentStep: state.currentStep,
        batteryId: state.batteryId,
        batterySequenceUnlockedThrough: state.batterySequenceUnlockedThrough,
        batteryStepSequence: state.batteryStepSequence,
        personalDataConsent: state.personalDataConsent,
        consentRecordedAt: state.consentRecordedAt,
        firstName: state.firstName,
        lastName: state.lastName,
        answers: state.answers,
        timerStartedAt: state.timerStartedAt,
        accessCodeSnapshot: state.accessCodeSnapshot,
        submissionStatus: state.submissionStatus,
        submitError: state.submitError,
        devTextReport: state.devTextReport,
        devEmailSent: state.devEmailSent,
        odIdentityQuestionnaire: state.odIdentityQuestionnaire,
        odIdentityCheckShownStepIndexes: state.odIdentityCheckShownStepIndexes,
      }),
      skipHydration: true,
    }
  )
);

/**
 * Превращает ответы с числовыми ключами шагов в объект со строковыми ключами
 * для JSON-сериализации и серверной zod-схемы.
 */
function _serializeAuditAnswersForSubmit(
  answers: AuditAnswersMap
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [stepIndex, stepAnswers] of Object.entries(answers)) {
    out[stepIndex] = stepAnswers;
  }
  return out;
}

/** Минимальная проверка: на финале ожидаем ответы по всем шагам маршрута. */
function _hasAuditAnswersForSubmit(answers: AuditAnswersMap): boolean {
  const stepKeys = Object.keys(answers);
  return stepKeys.length >= AUDIT_TOTAL_STEPS;
}

/** Готовность к отправке: полный аудит или завершённая батарея с ответами по шагам. */
function _isReadyForAuditSubmit(state: {
  batteryId: AuditBatteryId | null;
  batteryStepSequence: number[] | null;
  batterySequenceUnlockedThrough: number;
  answers: AuditAnswersMap;
}): boolean {
  if (state.batteryId !== null && state.batteryStepSequence !== null) {
    const battery = getAuditBatteryById(state.batteryId);
    if (battery === null) {
      return false;
    }
    const totalSteps = getBatteryTotalStepCount(battery);
    if (state.batterySequenceUnlockedThrough <= totalSteps) {
      return false;
    }
    for (const block of battery.blocks) {
      for (const stepIndex of block.stepIndexes) {
        if (stepIndex === BATTERY_PROF_SB_STEP_MARKER) {
          continue;
        }
        if (!_stepHasAnyAnswer(state.answers[stepIndex])) {
          return false;
        }
      }
    }
    if (isBatteryWithProfSbId(state.batteryId)) {
      const step4Data = useFormStore.getState().step4Data;
      if (!isStep4Complete(step4Data)) {
        return false;
      }
    }
    return true;
  }
  return _hasAuditAnswersForSubmit(state.answers);
}

function _buildProfSbSubmitPayload(state: {
  batteryId: AuditBatteryId | null;
}): Step4Data | null {
  if (!isBatteryWithProfSbId(state.batteryId)) {
    return null;
  }
  return useFormStore.getState().step4Data;
}

/** DEV: хотя бы один шаг с ненулевым ответом. */
function _hasAnyAuditAnswers(answers: AuditAnswersMap): boolean {
  for (const stepAnswers of Object.values(answers)) {
    if (_stepHasAnyAnswer(stepAnswers)) {
      return true;
    }
  }
  return false;
}

function _stepHasAnyAnswer(step: AuditStepAnswers | undefined): boolean {
  if (step === undefined) {
    return false;
  }
  for (const value of Object.values(step)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    return true;
  }
  return false;
}

/**
 * Возвращает согласие для payload submit.
 * Для сессий, начатых до фикса, восстанавливает согласие, если тест пройден до конца.
 */
function _resolveAuditSubmitConsent(state: {
  personalDataConsent: boolean;
  consentRecordedAt: string | null;
  maxUnlockedStep: number;
  answers: AuditAnswersMap;
  batteryId: AuditBatteryId | null;
  batteryStepSequence: number[] | null;
  batterySequenceUnlockedThrough: number;
}): { recordedAt: string; repaired: boolean } | null {
  if (state.personalDataConsent && state.consentRecordedAt) {
    return { recordedAt: state.consentRecordedAt, repaired: false };
  }
  if (
    state.maxUnlockedStep >= AUDIT_TOTAL_STEPS ||
    _isReadyForAuditSubmit(state)
  ) {
    return {
      recordedAt: state.consentRecordedAt ?? new Date().toISOString(),
      repaired: true,
    };
  }
  return null;
}
