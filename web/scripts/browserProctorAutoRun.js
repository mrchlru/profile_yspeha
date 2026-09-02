/**
 * Автопрохождение теста из консоли DevTools — для проверки прокторинга и отчёта по нарушениям.
 *
 * ВАЖНО: использует текущий sessionId из localStorage (тот же, что у активной proctor-сессии).
 * Не создаёт новую сессию — события прокторинга привяжутся к этому прохождению.
 *
 * Порядок:
 *   1. Откройте тест, введите код, пройдите intro, разрешите камеру/микрофон, нажмите «Начать».
 *   2. Перейдите на первый экран с вопросами (или останьтесь на текущем шаге).
 *   3. F12 → Console → вставьте этот файл целиком и Enter.
 *   4. Запустите:  await proctorAutoRun()
 *   5. Пока скрипт кликает «Далее», создавайте нарушения: телефон, взгляд в сторону, разговор.
 *
 * Команды:
 *   proctorStatus()                         — какой тест активен, sessionId
 *   await proctorAutoRun()                  — UI-режим, ~4 с между шагами (по умолчанию)
 *   await proctorAutoRun({ stepDelayMs: 8000, questionDelayMs: 300 })
 *   await proctorQuickSubmit()              — мгновенная отправка (выгорание / legacy-скрининг / ПРОФ СБ)
 *   proctorStop()                           — остановить UI-цикл
 */
(function browserProctorAutoRunBootstrap() {
  const STORAGE = {
    form: "profile-uspese-form-v13-anketa-expanded",
    audit: "audit-form-v4-battery",
    burnout: "burnout-form-store-v1",
    profSb: "prof-sb-education-form-store-v1",
  };

  const TEST_KINDS = {
    screening: "screening",
    burnout: "burnout",
    prof_sb_education: "prof_sb_education",
    audit: "audit_battery",
    legacy: "legacy_screening",
  };

  let abortFlag = false;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function readStore(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed.state ?? parsed : null;
    } catch {
      return null;
    }
  }

  function writeStore(key, patchFn) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      const nextState = patchFn(parsed.state ?? {});
      localStorage.setItem(
        key,
        JSON.stringify({ ...parsed, state: nextState, version: (parsed.version ?? 0) + 1 })
      );
      return nextState;
    } catch (err) {
      console.error("[proctorAutoRun] writeStore failed", key, err);
      return null;
    }
  }

  function isAuditKind(kind) {
    return (
      kind === "audit_senior" ||
      kind === "audit_middle" ||
      kind === "state_audit" ||
      kind === "state_audit_dev"
    );
  }

  /** Определяет активную батарею и sessionId (как useProctorBinding). */
  function detectProctorContext() {
    const form = readStore(STORAGE.form) ?? {};
    const kind = form.activeTestKind ?? null;

    if (isAuditKind(kind)) {
      const audit = readStore(STORAGE.audit) ?? {};
      return {
        kind: TEST_KINDS.audit,
        testKind: kind,
        sessionId: audit.sessionId ?? null,
        accessCode: audit.accessCodeSnapshot ?? form.validatedAccessCode ?? null,
        started:
          Boolean(audit.personalDataConsent) &&
          (audit.maxUnlockedStep > 0 ||
            audit.batterySequenceUnlockedThrough > 0 ||
            audit.currentStep > 0),
        firstName: audit.firstName ?? "",
        lastName: audit.lastName ?? "",
        batteryId: audit.batteryId ?? null,
        storeKey: STORAGE.audit,
      };
    }

    if (kind === "burnout") {
      const burnout = readStore(STORAGE.burnout) ?? {};
      return {
        kind: TEST_KINDS.burnout,
        testKind: kind,
        sessionId: burnout.sessionId ?? null,
        accessCode: burnout.accessCodeSnapshot ?? form.validatedAccessCode ?? null,
        started: Boolean(burnout.personalDataConsent) && Boolean(burnout.sessionId),
        firstName: burnout.firstName ?? "",
        lastName: burnout.lastName ?? "",
        storeKey: STORAGE.burnout,
      };
    }

    if (kind === "prof_sb_education") {
      const prof = readStore(STORAGE.profSb) ?? {};
      return {
        kind: TEST_KINDS.prof_sb_education,
        testKind: kind,
        sessionId: prof.sessionId ?? null,
        accessCode: prof.accessCodeSnapshot ?? form.validatedAccessCode ?? null,
        started: Boolean(prof.personalDataConsent) && Boolean(prof.sessionId),
        firstName: prof.firstName ?? "",
        lastName: prof.lastName ?? "",
        storeKey: STORAGE.profSb,
      };
    }

    if (kind === "screening") {
      return {
        kind: TEST_KINDS.legacy,
        testKind: kind,
        sessionId: form.sessionId ?? null,
        accessCode: form.validatedAccessCode ?? null,
        started: Boolean(form.personalDataConsent) && Boolean(form.sessionId),
        profileName: form.profileName ?? "",
        storeKey: STORAGE.form,
      };
    }

    return {
      kind: "unknown",
      testKind: kind,
      sessionId: form.sessionId ?? null,
      accessCode: form.validatedAccessCode ?? null,
      started: false,
      storeKey: STORAGE.form,
    };
  }

  function proctorStatus() {
    const ctx = detectProctorContext();
    const proctorGranted = readStore(STORAGE.form)?.proctorMediaGranted === true;
    console.log("[proctorAutoRun] Контекст:", {
      ...ctx,
      proctorMediaGranted: proctorGranted,
      path: location.pathname,
    });
    if (!proctorGranted) {
      console.warn(
        "[proctorAutoRun] Камера/микрофон ещё не разрешены — сначала пройдите intro прокторинга."
      );
    }
    if (!ctx.sessionId) {
      console.warn("[proctorAutoRun] sessionId не найден — нажмите «Начать тестирование» на intro.");
    }
    return ctx;
  }

  function proctorStop() {
    abortFlag = true;
    console.log("[proctorAutoRun] Остановка запрошена.");
  }

  function isNavButton(btn) {
    const t = (btn.textContent ?? "").trim();
    const navTexts = [
      "Dev ·",
      "Интро",
      "Текст. отчёт",
      "Закрыть",
      "Повторить отправку",
      "Повторить",
    ];
    if (navTexts.some((x) => t.includes(x))) return true;
    if (btn.closest('[aria-label="Dev: навигация по шагам аудита"]')) return true;
    return false;
  }

  function isActiveChoice(btn) {
    const cls = btn.className ?? "";
    return cls.includes("00B596") && cls.includes("text-white");
  }

  function findButtons(texts, root) {
    const scope = root ?? document;
    const list = [...scope.querySelectorAll("button")].filter((b) => !isNavButton(b));
    const wanted = Array.isArray(texts) ? texts : [texts];
    return list.filter((b) => {
      const t = (b.textContent ?? "").trim();
      return wanted.some((w) => t.includes(w));
    });
  }

  function clickFirstEnabled(texts) {
    const buttons = findButtons(texts);
    const btn = buttons.find((b) => !b.disabled);
    if (btn) {
      btn.click();
      return btn;
    }
    return null;
  }

  /** Заполняет видимые вопросы: в каждой карточке — первый ещё не выбранный вариант. */
  function fillVisibleQuestions() {
    let filled = 0;
    const cards = document.querySelectorAll("ol li, main li, [class*='rounded-2xl']");
    for (const card of cards) {
      const opts = [...card.querySelectorAll('button[type="button"]')].filter(
        (b) => !isNavButton(b)
      );
      if (opts.length < 2) continue;
      const hasActive = opts.some(isActiveChoice);
      if (!hasActive) {
        opts[0].click();
        filled += 1;
      }
    }

    /** CFIT и похожие: строки с кнопками 1–5 без «активного» выбора. */
    const digitRows = document.querySelectorAll("[data-cfit-row], [class*='cfit']");
    for (const row of digitRows) {
      const digits = [...row.querySelectorAll('button[type="button"]')].filter((b) =>
        /^[1-5]$/.test((b.textContent ?? "").trim())
      );
      if (digits.length > 0 && !digits.some(isActiveChoice)) {
        digits[0].click();
        filled += 1;
      }
    }

    return filled;
  }

  function isFinishPath(path) {
    return /\/finish\/?$/.test(path) || path.endsWith("/step-4");
  }

  async function waitForSubmissionComplete(timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && !abortFlag) {
      const text = document.body?.innerText ?? "";
      if (
        text.includes("Ответы успешно сохранены") ||
        text.includes("Текстовый отчёт готов") ||
        text.includes("успешно сохранены")
      ) {
        console.log("[proctorAutoRun] Отправка завершена.");
        return true;
      }
      if (text.includes("Не удалось сохранить") || text.includes("Не удалось сформировать")) {
        console.warn("[proctorAutoRun] Ошибка отправки на экране finish.");
        return false;
      }
      await sleep(800);
    }
    return false;
  }

  async function processCurrentPage(options) {
    const maxRounds = 60;
    for (let round = 0; round < maxRounds; round += 1) {
      if (abortFlag) return "aborted";

      if (isFinishPath(location.pathname)) {
        return "finish";
      }

      const introClicked = clickFirstEnabled("Далее");
      if (introClicked) {
        console.log("[proctorAutoRun] Инструкция → вопросы");
        await sleep(options.stepDelayMs);
        continue;
      }

      const filled = fillVisibleQuestions();
      if (filled > 0) {
        console.log(`[proctorAutoRun] Выбрано вариантов: ${String(filled)}`);
      }
      await sleep(options.questionDelayMs);

      const stubClicked = clickFirstEnabled("Завершить шаг (заглушка)");
      if (stubClicked) {
        console.log("[proctorAutoRun] Заглушка шага");
        await sleep(options.stepDelayMs);
        return "navigated";
      }

      const completeTexts = ["Завершить тест", "Завершить шаг", "Отправить", "Продолжить"];
      const completeBtn = findButtons(completeTexts).find((b) => !b.disabled);
      if (completeBtn) {
        console.log("[proctorAutoRun] →", (completeBtn.textContent ?? "").trim());
        completeBtn.click();
        await sleep(options.stepDelayMs);
        return "navigated";
      }

      await sleep(400);
    }
    console.warn("[proctorAutoRun] Лимит итераций на странице — возможно, нужно заполнить поля вручную.");
    return "stuck";
  }

  /**
   * UI-режим: кликает по экрану с паузами. Прокторинг продолжает работать.
   * @param {object} [options]
   * @param {number} [options.stepDelayMs=4000] — пауза после перехода шага (время на нарушения)
   * @param {number} [options.questionDelayMs=400] — пауза между блоками вопросов
   * @param {number} [options.maxSteps=200] — защита от бесконечного цикла
   */
  async function proctorAutoRun(options = {}) {
    abortFlag = false;
    const opts = {
      stepDelayMs: options.stepDelayMs ?? 4000,
      questionDelayMs: options.questionDelayMs ?? 400,
      maxSteps: options.maxSteps ?? 200,
    };

    const ctx = proctorStatus();
    if (!ctx.sessionId) {
      throw new Error("Нет sessionId. Пройдите intro и нажмите «Начать».");
    }
    if (readStore(STORAGE.form)?.proctorMediaGranted !== true) {
      console.warn("[proctorAutoRun] proctorMediaGranted=false — события могут не писаться.");
    }

    console.log(
      `%c[proctorAutoRun] Старт UI-режима`,
      "color:#00B596;font-weight:bold",
      `stepDelay=${String(opts.stepDelayMs)}ms`,
      `sessionId=${ctx.sessionId}`
    );
    console.log("[proctorAutoRun] proctorStop() — остановить.");

    let lastPath = "";
    for (let step = 0; step < opts.maxSteps; step += 1) {
      if (abortFlag) {
        console.log("[proctorAutoRun] Остановлено.");
        return { ok: false, reason: "aborted", sessionId: ctx.sessionId };
      }

      const path = location.pathname;
      if (path !== lastPath) {
        console.log("[proctorAutoRun] Страница:", path);
        lastPath = path;
      }

      if (isFinishPath(path)) {
        console.log("[proctorAutoRun] Финиш — ждём авто-submit…");
        await waitForSubmissionComplete(120_000);
        return { ok: true, sessionId: ctx.sessionId, finished: true };
      }

      const result = await processCurrentPage(opts);
      if (result === "finish") {
        await waitForSubmissionComplete(120_000);
        return { ok: true, sessionId: ctx.sessionId, finished: true };
      }
      if (result === "aborted") {
        return { ok: false, reason: "aborted", sessionId: ctx.sessionId };
      }

      await sleep(800);
    }

    console.warn("[proctorAutoRun] Достигнут maxSteps.");
    return { ok: false, reason: "maxSteps", sessionId: ctx.sessionId };
  }

  /** Валидные ответы для legacy-скрининга (из browserQuickScreening.js). */
  const LEGACY_SCREENING = {
    step2: {
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
    },
    step4: {
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
      courses: [],
      specialExperience: [],
      conferences: [],
      literature: [],
      languages: [{ language: "русский", level: "native" }],
      currentWork: {
        organization: "Тест",
        city: "Нижний Новгород",
        field: "services",
        position: "Специалист",
        positionLevel: "specialist",
        startDate: "2020-01",
        endDate: "",
        matchesEducation: "yes",
        subordinates: "0",
        totalEmployees: "50",
        duties: "Тест",
        achievements: "Тест",
        leaveReason: "",
      },
      previousWork: [],
      socialMedia: [],
      onlineGames: [],
    },
  };

  function buildLegacyStep1() {
    const out = {};
    for (let i = 1; i <= 50; i += 1) out[`q${String(i)}`] = "1";
    return out;
  }

  function buildLegacyStep3() {
    const out = {};
    for (let i = 1; i <= 10; i += 1) out[`q${String(i)}`] = "fully_agree";
    return out;
  }

  function buildBurnoutAnswers() {
    const answers = {};
    for (let i = 1; i <= 22; i += 1) answers[`q${String(i)}`] = 3;
    return answers;
  }

  async function submitBurnoutFast(ctx) {
    const burnout = readStore(STORAGE.burnout) ?? {};
    const accessCode = (ctx.accessCode ?? "").trim();
    const sessionId = ctx.sessionId;
    const consentRecordedAt =
      burnout.consentRecordedAt ?? new Date().toISOString();
    const firstName = (ctx.firstName || burnout.firstName || "Тест").trim();
    const lastName = (ctx.lastName || burnout.lastName || "Проктор").trim();
    const answers = buildBurnoutAnswers();

    writeStore(STORAGE.burnout, (s) => ({
      ...s,
      answers,
      sessionId,
      accessCodeSnapshot: accessCode,
    }));

    const res = await fetch("/api/burnout/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        accessCode,
        firstName,
        lastName,
        personalDataConsent: true,
        consentRecordedAt,
        answers,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) {
      throw new Error(body.error ?? `HTTP ${String(res.status)}`);
    }
    return { ok: true, sessionId };
  }

  async function submitLegacyScreeningFast(ctx) {
    const form = readStore(STORAGE.form) ?? {};
    const accessCode = (ctx.accessCode ?? "").trim();
    const sessionId = ctx.sessionId;
    const profileName = ctx.profileName || form.profileName || "Проктор-тест";
    const consentRecordedAt = form.consentRecordedAt ?? new Date().toISOString();
    const kotExpiredAt = new Date(Date.now() - 21 * 60 * 1000).toISOString();

    writeStore(STORAGE.form, (s) => ({
      ...s,
      sessionId,
      validatedAccessCode: accessCode,
      step1Data: buildLegacyStep1(),
      step2Data: LEGACY_SCREENING.step2,
      step3Data: buildLegacyStep3(),
      step4Data: LEGACY_SCREENING.step4,
      kotTimerStartedAt: kotExpiredAt,
      personalDataConsent: true,
      consentRecordedAt,
    }));

    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        accessCode,
        profileName,
        personalDataConsent: true,
        consentRecordedAt,
        step1Data: buildLegacyStep1(),
        step2Data: LEGACY_SCREENING.step2,
        step3Data: buildLegacyStep3(),
        step4Data: LEGACY_SCREENING.step4,
      }),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      throw new Error(json?.error ?? text ?? `HTTP ${String(res.status)}`);
    }
    return { ok: true, sessionId, response: json ?? text };
  }

  async function submitProfSbFast(ctx) {
    const prof = readStore(STORAGE.profSb) ?? {};
    const accessCode = (ctx.accessCode ?? "").trim();
    const sessionId = ctx.sessionId;
    const consentRecordedAt = prof.consentRecordedAt ?? new Date().toISOString();
    const firstName = (ctx.firstName || prof.firstName || "Тест").trim();
    const lastName = (ctx.lastName || prof.lastName || "Проктор").trim();
    const answers = { profSb: {}, profEducation: {} };

    const res = await fetch("/api/prof-sb-education/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        accessCode,
        firstName,
        lastName,
        personalDataConsent: true,
        consentRecordedAt,
        answers,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) {
      throw new Error(body.error ?? `HTTP ${String(res.status)}`);
    }
    return { ok: true, sessionId };
  }

  /**
   * Мгновенная отправка без UI. Подходит для выгорания, legacy-скрининга, ПРОФ СБ.
   * Для батарей ОД/ТУ/скрининга (audit) используйте proctorAutoRun() — там много шагов.
   */
  async function proctorQuickSubmit() {
    const ctx = proctorStatus();
    if (!ctx.sessionId) {
      throw new Error("Нет sessionId.");
    }

    console.log("[proctorAutoRun] Быстрая отправка:", ctx.kind);

    if (ctx.kind === TEST_KINDS.burnout) {
      const result = await submitBurnoutFast(ctx);
      console.log("[proctorAutoRun] Выгорание отправлено.", result);
      return result;
    }
    if (ctx.kind === TEST_KINDS.legacy) {
      const result = await submitLegacyScreeningFast(ctx);
      console.log("[proctorAutoRun] Legacy-скрининг отправлен.", result);
      return result;
    }
    if (ctx.kind === TEST_KINDS.prof_sb_education) {
      const result = await submitProfSbFast(ctx);
      console.log("[proctorAutoRun] ПРОФ СБ отправлен.", result);
      return result;
    }

    throw new Error(
      `Быстрая отправка не поддерживается для «${String(ctx.testKind)}». Используйте await proctorAutoRun() — UI пройдёт все шаги батареи.`
    );
  }

  window.proctorStatus = proctorStatus;
  window.proctorAutoRun = proctorAutoRun;
  window.proctorQuickSubmit = proctorQuickSubmit;
  window.proctorStop = proctorStop;

  console.log(
    "%c[proctorAutoRun] Готово",
    "color:#00B596;font-weight:bold",
    "\n  proctorStatus()",
    "\n  await proctorAutoRun()",
    "\n  await proctorAutoRun({ stepDelayMs: 8000 })",
    "\n  await proctorQuickSubmit()  // выгорание / legacy / ПРОФ СБ",
    "\n  proctorStop()"
  );
})();
