/**
 * Быстрый проход скрининга из консоли DevTools (на том же origin, что и приложение).
 *
 * 1. Откройте сайт скрининга, введите код приглашения на welcome (или передайте код в опциях).
 * 2. F12 → Console → вставьте весь этот файл и Enter.
 * 3. Вызовите:
 *      await quickScreeningSubmit()
 *    или с явным кодом:
 *      await quickScreeningSubmit({ accessCode: "ВАШ_КОД_СКРИНИНГА" })
 *
 * Альтернатива — заполнить localStorage и открыть шаг 4 (кнопка «Отправить» в UI):
 *      quickScreeningFill()
 *      location.href = "/step-4"
 */
(function browserQuickScreeningBootstrap() {
  const STORAGE_KEY = "profile-uspese-form-v13-anketa-expanded";
  const KOT_DURATION_MS = 20 * 60 * 1000;

  /** Валидные ответы Герчикова (seed 42 из scripts/autoFillAudit.ts). */
  const STEP2_DATA = {
    q1: "staff",
    q2: "male",
    q3: "55",
    q4: ["17", "2"],
    q5: ["a2", "a5"],
    q6: "a6",
    q7: ["a2"],
    q8: ["not", "not", "very", "very", "somewhat", "not", "somewhat", "very", "somewhat"],
    q9: "a5",
    q10: ["a4"],
    q11: ["a2"],
    q12: ["a2"],
    q13: ["a4", "a1"],
    q14: ["a6"],
    q15: ["a6", "a2"],
    q16: ["b1"],
  };

  const STEP4_DATA = {
    personal: {
      lastName: "Автотестов",
      firstName: "Иван",
      middleName: "Иванович",
      gender: "male",
      birthDate: "1990-05-15",
      email: "autotest@example.com",
      phone: "+7 (900) 000-00-00",
      country: "Россия",
      region: "Нижегородская область",
      citizenship: "РФ",
      nationality: "Русский",
      maritalStatus: "married",
      address: "г. Нижний Новгород, ул. Тестовая, д. 1",
      workCommute: "same_city",
      travelTime: "<30",
      religiousRequirements: "none",
      housingOwnership: "owned",
      hasElderlyParents: "no",
      dependentsCount: "1",
      dependentsDescription: "Ребёнок",
      childrenCount: "1",
      childrenBirthDates: "2019-08-11",
      hasCriminalRecord: "no",
      badHabits: "none",
      currentIncome: "150000",
      desiredIncome: "250000",
      creditSalaries: "0",
      companyCreditSalaries: "0",
    },
    educationLevel: "higher_full_time",
    additionalEducation: "mba",
    educationEntries: [
      {
        yearStart: "2004",
        yearEnd: "2009",
        institution: "ННГУ им. Лобачевского",
        specialty: "Психолог. Общая психология.",
      },
    ],
    courses: [
      {
        period: "сентябрь 2023 — март 2024",
        duration: "6 месяцев",
        institutionAndCourse:
          "Научный автономный некоммерческий институт. Курс «Управление».",
        paidBy: "self",
        document: "diploma",
      },
    ],
    specialExperience: [
      {
        direction:
          "Моделирование (описание), модификация (реинжиниринг) бизнес-процессов",
        role: "руководитель",
        withinProject: "да",
        duration: "более 1 года",
        organization: 'ООО "Тест"',
      },
    ],
    conferences: [],
    literature: [
      { title: "Управление жизненным циклом компании", author: "Адизес", date: "2025" },
    ],
    languages: [{ language: "английский", level: "beginner" }],
    currentWork: {
      organization: "Ресторанный холдинг",
      city: "Нижний Новгород",
      field: "services",
      position: "Директор по персоналу",
      positionLevel: "top_manager",
      startDate: "2024-05",
      endDate: "",
      matchesEducation: "yes",
      subordinates: "8",
      totalEmployees: "2400",
      duties: "Подбор, мотивация, стимуляция, ЗП сотрудников, удержание",
      achievements: "Выстроил процесс адаптации, снизил текучку на 20%",
      leaveReason: "",
    },
    previousWork: [],
    socialMedia: [{ network: "ВКонтакте", identifier: "https://vk.com/test" }],
    onlineGames: [],
  };

  function newSessionId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function readPersistedStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function buildStep1Data() {
    const out = {};
    for (let i = 1; i <= 50; i += 1) {
      out[`q${String(i)}`] = "1";
    }
    return out;
  }

  function buildStep3Data() {
    const out = {};
    for (let i = 1; i <= 10; i += 1) {
      out[`q${String(i)}`] = "fully_agree";
    }
    return out;
  }

  function resolveAccessCode(options) {
    if (options.accessCode && String(options.accessCode).trim().length >= 8) {
      return String(options.accessCode).trim();
    }
    const persisted = readPersistedStore();
    const fromStore = persisted?.state?.validatedAccessCode;
    if (typeof fromStore === "string" && fromStore.trim().length >= 8) {
      return fromStore.trim();
    }
    return null;
  }

  function buildSubmitBody(options) {
    const accessCode = resolveAccessCode(options);
    if (!accessCode) {
      throw new Error(
        "Нет кода скрининга. Сначала пройдите welcome с кодом приглашения или вызовите quickScreeningSubmit({ accessCode: \"...\" })"
      );
    }

    const persisted = readPersistedStore();
    const state = persisted?.state ?? {};

    const sessionId =
      (options.sessionId && String(options.sessionId).trim()) ||
      (typeof state.sessionId === "string" && state.sessionId.trim()) ||
      newSessionId();

    const profileName =
      (options.profileName && String(options.profileName).trim()) ||
      (typeof state.profileName === "string" && state.profileName.trim()) ||
      "Автотест консоли";

    const consentRecordedAt =
      (typeof state.consentRecordedAt === "string" && state.consentRecordedAt) ||
      new Date().toISOString();

    return {
      sessionId,
      accessCode,
      profileName,
      personalDataConsent: true,
      consentRecordedAt,
      step1Data: buildStep1Data(),
      step2Data: STEP2_DATA,
      step3Data: buildStep3Data(),
      step4Data: STEP4_DATA,
    };
  }

  function writeFilledStore(options) {
    const body = buildSubmitBody(options);
    const kotExpiredAt = new Date(Date.now() - KOT_DURATION_MS - 60_000).toISOString();
    const existing = readPersistedStore();
    const version = typeof existing?.version === "number" ? existing.version : 0;

    const payload = {
      state: {
        sessionId: body.sessionId,
        validatedAccessCode: body.accessCode,
        activeTestKind: "screening",
        profileName: body.profileName,
        personalDataConsent: true,
        consentRecordedAt: body.consentRecordedAt,
        kotTimerStartedAt: kotExpiredAt,
        step1Data: body.step1Data,
        step2Data: body.step2Data,
        step3Data: body.step3Data,
        step4Data: body.step4Data,
        submissionStatus: "idle",
        submitError: null,
      },
      version,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return body;
  }

  /**
   * POST /api/submit с полным валидным payload (самый быстрый способ).
   * @param {object} [options]
   * @param {string} [options.accessCode]
   * @param {string} [options.profileName]
   * @param {string} [options.sessionId]
   */
  async function quickScreeningSubmit(options = {}) {
    const body = buildSubmitBody(options);
    console.log("[quickScreening] Отправка…", {
      sessionId: body.sessionId,
      accessCode: `${body.accessCode.slice(0, 4)}…`,
      profileName: body.profileName,
    });

    const response = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* не JSON */
    }

    if (!response.ok) {
      console.error("[quickScreening] Ошибка HTTP", response.status, text);
      throw new Error(json?.error || text || `HTTP ${String(response.status)}`);
    }

    console.log("[quickScreening] Успех", json ?? text);
    console.log("[quickScreening] sessionId =", body.sessionId);
    return { ok: true, sessionId: body.sessionId, response: json ?? text };
  }

  /**
   * Записывает ответы в localStorage (zustand persist). После reload откройте /step-4 и нажмите «Отправить».
   * @param {object} [options]
   */
  function quickScreeningFill(options = {}) {
    const body = writeFilledStore(options);
    console.log("[quickScreening] localStorage заполнен. Перезагрузите страницу и откройте /step-4");
    console.log("[quickScreening] sessionId =", body.sessionId);
    return body;
  }

  window.quickScreeningSubmit = quickScreeningSubmit;
  window.quickScreeningFill = quickScreeningFill;

  console.log(
    "%c[quickScreening] Готово",
    "color:#00B596;font-weight:bold",
    "\n  await quickScreeningSubmit()",
    "\n  await quickScreeningSubmit({ accessCode: \"КОД\" })",
    "\n  quickScreeningFill() → location.reload() → /step-4"
  );
})();
