"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { StepLayout } from "@/components/StepLayout";
import { TestMotivation } from "@/components/TestMotivation";
import {
  questionCardSurfaceClass,
  stepInputClass,
  stepLabelClass,
  stepNavPrimaryButtonClass,
  stepPageContentClass,
} from "@/lib/stepPageTheme";
import { useScreeningStepLog } from "@/lib/logging/useScreeningStepLog";
import { TOTAL_QUESTIONS_COUNT, getAllAnsweredCount } from "@/lib/progress";
import { setScreeningMaxStepCookie } from "@/lib/screeningProgressCookie";
import { queueScreeningStepSync } from "@/lib/screening/syncScreeningStepClient";
import { getContinueButtonLabel } from "@/lib/testMotivation";
import { BATTERY_PROF_SB_STEP_MARKER } from "@/lib/audit/batteryStepMarkers";
import { getBatteryNextRouteAfterStep } from "@/lib/audit/batteryNavigation";
import { navigateAfterFormPersist } from "@/lib/navigateAfterFormPersist";
import {
  getBatterySequenceStepProgress,
} from "@/lib/audit/auditBatteries";
import { prefillStep4PersonalFromAuditNames } from "@/lib/step4/prefillStep4FromAudit";
import { useStep4PageAccessReady } from "@/hooks/useStep4PageAccess";
import { useTuBatteryProfSbMode } from "@/hooks/useTuBatteryProfSbMode";
import { useTuBatteryProfSbStepReady } from "@/hooks/useProfSbEducationAccessGate";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import {
  STEP4_REQUIRED_SECTION_DOM_IDS,
  getFirstIncompleteStep4SectionDomId,
  isStep4Complete,
  type Step4RequiredSectionDomId,
} from "@/lib/validation/stepCompletion";
import {
  STEP4_MAX_CONFERENCES,
  STEP4_MAX_COURSES,
  STEP4_MAX_EDUCATION_ENTRIES,
  STEP4_MAX_LANGUAGES,
  STEP4_MAX_LITERATURE,
  STEP4_MAX_ONLINE_GAMES,
  STEP4_MAX_PREVIOUS_WORK,
  STEP4_MAX_SOCIAL_MEDIA,
  STEP4_MAX_SPECIAL_EXPERIENCE,
  createEmptyConferenceEntry,
  createEmptyCourseEntry,
  createEmptyEducationEntry,
  createEmptyLanguageEntry,
  createEmptyLiteratureEntry,
  createEmptyOnlineGame,
  createEmptySocialMedia,
  createEmptySpecialExperience,
  createEmptyWorkPlace,
  type Step4Personal,
  type Step4SpecialExperienceEntry,
  type Step4WorkPlace,
} from "@/lib/step4/step4Types";
import {
  STEP4_BAD_HABITS_OPTIONS,
  STEP4_COURSE_DOCUMENT_OPTIONS,
  STEP4_EDUCATION_LEVEL_OPTIONS,
  STEP4_FAMILY_OPTIONS,
  STEP4_FIELD_OPTIONS,
  STEP4_HOUSING_OPTIONS,
  STEP4_LANGUAGE_LEVEL_OPTIONS,
  STEP4_PAID_BY_OPTIONS,
  STEP4_POSITION_LEVEL_OPTIONS,
  STEP4_RELIGIOUS_OPTIONS,
  STEP4_SPECIAL_EXPERIENCE_DURATION_OPTIONS,
  STEP4_SPECIAL_EXPERIENCE_ROLE_OPTIONS,
  STEP4_SPECIAL_EXPERIENCE_WITHIN_PROJECT_OPTIONS,
  STEP4_TRAVEL_TIME_OPTIONS,
  STEP4_WORK_COMMUTE_OPTIONS,
  type Step4Option,
} from "@/lib/step4/step4Labels";
import { TEST_KIND_SCREENING } from "@/lib/access/testKinds";
import { Step4Data, useFormStore } from "@/store/useFormStore";

type SelectOption = Step4Option;

const sectionTitleClass =
  "mb-3 text-[16px] font-semibold text-[#1B1B1B] sm:text-[17px]";
const subSectionTitleClass =
  "mb-2 mt-3 text-[14px] font-semibold text-[#1B1B1B]";
const fieldRowClass = "grid grid-cols-1 gap-3 sm:grid-cols-2";
const fieldRowThreeClass = "grid grid-cols-1 gap-3 sm:grid-cols-3";
const removeBtnClass =
  "text-[13px] text-[#A33] underline-offset-2 hover:underline";
const addBtnClass =
  "mt-2 inline-flex items-center gap-1 rounded-md border border-[#D5D5D5] bg-white px-3 py-1.5 text-[13px] text-[#1B1B1B] hover:bg-[#F4F4F4] disabled:opacity-50";

const STEP4_SECTION_HIGHLIGHT_RING =
  "shadow-[0_0_0_3px_#C0392B] transition-shadow duration-300";

function step4RequiredSectionClassName(
  highlightId: Step4RequiredSectionDomId | null,
  sectionId: Step4RequiredSectionDomId,
  surfaceLayout: string
): string {
  return highlightId === sectionId
    ? `${surfaceLayout} ${STEP4_SECTION_HIGHLIGHT_RING}`
    : surfaceLayout;
}

const familyOptions: ReadonlyArray<SelectOption> = STEP4_FAMILY_OPTIONS;
const educationLevelOptions: ReadonlyArray<SelectOption> = STEP4_EDUCATION_LEVEL_OPTIONS;
const workCommuteOptions: ReadonlyArray<SelectOption> = STEP4_WORK_COMMUTE_OPTIONS;
const travelTimeOptions: ReadonlyArray<SelectOption> = STEP4_TRAVEL_TIME_OPTIONS;
const religiousOptions: ReadonlyArray<SelectOption> = STEP4_RELIGIOUS_OPTIONS;
const housingOptions: ReadonlyArray<SelectOption> = STEP4_HOUSING_OPTIONS;
const badHabitsOptions: ReadonlyArray<SelectOption> = STEP4_BAD_HABITS_OPTIONS;
const positionLevelOptions: ReadonlyArray<SelectOption> = STEP4_POSITION_LEVEL_OPTIONS;
const fieldOptions: ReadonlyArray<SelectOption> = STEP4_FIELD_OPTIONS;
const languageLevelOptions: ReadonlyArray<SelectOption> = STEP4_LANGUAGE_LEVEL_OPTIONS;
const paidByOptions: ReadonlyArray<SelectOption> = STEP4_PAID_BY_OPTIONS;
const courseDocumentOptions: ReadonlyArray<SelectOption> = STEP4_COURSE_DOCUMENT_OPTIONS;
const specialRoleOptions: ReadonlyArray<SelectOption> = STEP4_SPECIAL_EXPERIENCE_ROLE_OPTIONS;
const specialWithinProjectOptions: ReadonlyArray<SelectOption> =
  STEP4_SPECIAL_EXPERIENCE_WITHIN_PROJECT_OPTIONS;
const specialDurationOptions: ReadonlyArray<SelectOption> =
  STEP4_SPECIAL_EXPERIENCE_DURATION_OPTIONS;

/** Парсит «число обеспечиваемых» к числу; пустое или нечисловое — 0. */
function parseDependentsCount(raw: string): number {
  const n = parseInt(raw.replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Чистит ввод телефона от букв и других недопустимых символов.
 * Разрешены: цифры, «+», пробел, дефис, круглые скобки.
 */
function sanitizePhoneInput(raw: string): string {
  return raw.replace(/[^0-9+()\-\s]/g, "");
}

const specialExperienceDirections: ReadonlyArray<string> = [
  "Моделирование (описание), модификация (реинжиниринг) бизнес-процессов",
  "Разработка, оптимизация и внедрение систем планирования (бюджетирования)",
  "Разработка, оптимизация и внедрение систем экономической мотивации",
  "Разработка, оптимизация и внедрение систем электронного документооборота",
  "Разработка методологий, подготовка технических заданий",
  "Осуществление проверок, аудитов, контрольных мероприятий",
  "Разработка стратегий, целей, систем показателей",
];

function TextField(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "date" | "number";
}): React.ReactElement {
  return (
    <div>
      <label className={stepLabelClass}>{props.label}</label>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className={stepInputClass}
      />
    </div>
  );
}

function TextareaField(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  rows?: number;
}): React.ReactElement {
  return (
    <div className="sm:col-span-2">
      <label className={stepLabelClass}>{props.label}</label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={props.rows ?? 3}
        className={`${stepInputClass} resize-y`}
      />
    </div>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<SelectOption>;
  placeholder?: string;
}): React.ReactElement {
  return (
    <div>
      <label className={stepLabelClass}>{props.label}</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className={stepInputClass}
      >
        <option value="" disabled>
          {props.placeholder ?? "Выберите значение"}
        </option>
        {props.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function YesNoField(props: {
  label: string;
  value: "" | "yes" | "no";
  onChange: (value: "" | "yes" | "no") => void;
}): React.ReactElement {
  return (
    <div>
      <label className={stepLabelClass}>{props.label}</label>
      <div className="flex items-center gap-4 pt-1 text-[14px]">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={props.value === "yes"}
            onChange={() => props.onChange("yes")}
          />
          Да
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={props.value === "no"}
            onChange={() => props.onChange("no")}
          />
          Нет
        </label>
      </div>
    </div>
  );
}

function GenderField(props: {
  value: "" | "male" | "female";
  onChange: (value: "" | "male" | "female") => void;
}): React.ReactElement {
  return (
    <div>
      <label className={stepLabelClass}>Пол</label>
      <div className="flex items-center gap-4 pt-1 text-[14px]">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={props.value === "male"}
            onChange={() => props.onChange("male")}
          />
          Мужской
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={props.value === "female"}
            onChange={() => props.onChange("female")}
          />
          Женский
        </label>
      </div>
    </div>
  );
}

export default function Step4Page(): React.ReactElement {
  const router = useRouter();
  const tuBatteryMode = useTuBatteryProfSbMode();
  const accessReady = useStep4PageAccessReady();
  const tuStepReady = useTuBatteryProfSbStepReady();
  const testKind = useFormStore((s) => s.activeTestKind);
  const profileName = useFormStore((s) => s.profileName);
  const sessionId = useFormStore((s) => s.sessionId);
  const batteryStepSequence = useAuditFormStore((s) => s.batteryStepSequence);
  const auditFirstName = useAuditFormStore((s) => s.firstName);
  const auditLastName = useAuditFormStore((s) => s.lastName);
  const markStepReached = useAuditFormStore((s) => s.markStepReached);
  const markStepCompleted = useAuditFormStore((s) => s.markStepCompleted);
  useScreeningStepLog("step-4", sessionId);
  const step1Data = useFormStore((s) => s.step1Data);
  const step2Data = useFormStore((s) => s.step2Data);
  const step3Data = useFormStore((s) => s.step3Data);
  const step4Data = useFormStore((s) => s.step4Data);
  const setStep4Data = useFormStore((s) => s.setStep4Data);
  const [step4HighlightSectionId, setStep4HighlightSectionId] =
    useState<Step4RequiredSectionDomId | null>(null);
  const step4HighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearStep4HighlightTimer(): void {
    if (step4HighlightTimerRef.current !== null) {
      clearTimeout(step4HighlightTimerRef.current);
      step4HighlightTimerRef.current = null;
    }
  }

  function scheduleStep4HighlightClear(): void {
    clearStep4HighlightTimer();
    step4HighlightTimerRef.current = setTimeout(() => {
      setStep4HighlightSectionId(null);
      step4HighlightTimerRef.current = null;
    }, 6000);
  }

  useEffect(() => {
    return () => {
      if (step4HighlightTimerRef.current !== null) {
        clearTimeout(step4HighlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!accessReady || tuBatteryMode) {
      return;
    }
    if (testKind === TEST_KIND_SCREENING) {
      router.replace("/audit/intro");
      return;
    }
    router.replace("/");
  }, [accessReady, router, testKind, tuBatteryMode]);

  useEffect(() => {
    if (!accessReady || !tuBatteryMode) {
      return;
    }
    if (!tuStepReady) {
      return;
    }
    markStepReached(BATTERY_PROF_SB_STEP_MARKER);
    const prefilled = prefillStep4PersonalFromAuditNames(
      step4Data,
      auditFirstName,
      auditLastName
    );
    if (prefilled !== step4Data) {
      setStep4Data(prefilled);
    }
  }, [
    accessReady,
    auditFirstName,
    auditLastName,
    markStepReached,
    setStep4Data,
    step4Data,
    tuBatteryMode,
    tuStepReady,
  ]);

  useEffect(() => {
    if (tuBatteryMode) {
      setScreeningMaxStepCookie(4);
    }
  }, [tuBatteryMode]);

  const complete = isStep4Complete(step4Data);
  const answeredCount = getAllAnsweredCount(step1Data, step2Data, step3Data, step4Data);
  const continueLabel = getContinueButtonLabel(answeredCount);
  const primaryLabel = tuBatteryMode
    ? complete
      ? "Далее"
      : "Заполните обязательные поля"
    : complete
      ? "Завершить"
      : continueLabel;

  const sequenceProgress =
    batteryStepSequence !== null
      ? getBatterySequenceStepProgress(
          batteryStepSequence,
          BATTERY_PROF_SB_STEP_MARKER
        )
      : null;

  const pageReady = accessReady && (!tuBatteryMode || tuStepReady);

  function update(patch: Partial<Step4Data>): void {
    clearStep4HighlightTimer();
    setStep4HighlightSectionId(null);
    setStep4Data({ ...step4Data, ...patch });
  }

  function setPersonal<K extends keyof Step4Personal>(
    key: K,
    value: Step4Personal[K]
  ): void {
    update({ personal: { ...step4Data.personal, [key]: value } });
  }

  function setCurrentWork<K extends keyof Step4WorkPlace>(
    key: K,
    value: Step4WorkPlace[K]
  ): void {
    update({ currentWork: { ...step4Data.currentWork, [key]: value } });
  }

  function updateArrayItem<T>(arr: T[], idx: number, patch: Partial<T>): T[] {
    return arr.map((item, i) => (i === idx ? { ...item, ...patch } : item));
  }

  if (!pageReady) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
          Загрузка…
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout>
      <div className={stepPageContentClass}>
        {!tuBatteryMode ? (
          <div className="mb-2">
            <ProgressBar answeredQuestions={answeredCount} totalQuestions={TOTAL_QUESTIONS_COUNT} />
            <TestMotivation profileName={profileName} answeredCount={answeredCount} />
          </div>
        ) : sequenceProgress !== null ? (
          <p className="mb-3 text-[14px] font-semibold text-[#8C8C8C]">
            {`Шаг ${String(sequenceProgress.stepNumber)} из ${String(sequenceProgress.totalSteps)}: анкета ПРОФ СБ`}
          </p>
        ) : null}

        <h1 className="mb-3 text-center text-[22px] font-semibold text-[#1B1B1B] sm:text-[24px]">
          Анкета ПРОФ СБ
        </h1>
        <div className="mb-5 space-y-2 text-[14px] font-semibold leading-snug text-[#C0392B]">
          <p>
            Пожалуйста, заполните по порядку представленные ниже формы
            максимально полно и подробно.
          </p>
          <p>
            Внимание!!! Рекомендуется указывать максимально полную информацию. В
            случае заполнения не всех данных, результаты могут быть существенно
            хуже.
          </p>
        </div>

        {/* Личные данные */}
        <div
          id={STEP4_REQUIRED_SECTION_DOM_IDS.personal}
          className={step4RequiredSectionClassName(
            step4HighlightSectionId,
            STEP4_REQUIRED_SECTION_DOM_IDS.personal,
            `${questionCardSurfaceClass} p-6 sm:px-8 sm:py-6`
          )}
        >
          <h2 className={sectionTitleClass}>Личные данные</h2>
          <div className={fieldRowClass}>
            <TextField
              label="Фамилия"
              value={step4Data.personal.lastName}
              onChange={(v) => setPersonal("lastName", v)}
              placeholder="Например, Иванов"
            />
            <TextField
              label="Имя"
              value={step4Data.personal.firstName}
              onChange={(v) => setPersonal("firstName", v)}
              placeholder="Например, Иван"
            />
            <TextField
              label="Отчество"
              value={step4Data.personal.middleName}
              onChange={(v) => setPersonal("middleName", v)}
              placeholder="Если есть"
            />
            <GenderField
              value={step4Data.personal.gender}
              onChange={(v) => setPersonal("gender", v)}
            />
            <TextField
              label="Дата рождения"
              value={step4Data.personal.birthDate}
              onChange={(v) => setPersonal("birthDate", v)}
              type="date"
            />
            <TextField
              label="E-mail"
              value={step4Data.personal.email}
              onChange={(v) => setPersonal("email", v)}
              type="email"
              placeholder="name@example.com"
            />
            <TextField
              label="Телефон"
              value={step4Data.personal.phone}
              onChange={(v) => setPersonal("phone", sanitizePhoneInput(v))}
              type="tel"
              placeholder="+7 ..."
            />
            <TextField
              label="Страна проживания"
              value={step4Data.personal.country}
              onChange={(v) => setPersonal("country", v)}
              placeholder="Россия"
            />
            <TextField
              label="Регион проживания"
              value={step4Data.personal.region}
              onChange={(v) => setPersonal("region", v)}
              placeholder="Нижегородская область"
            />
            <TextField
              label="Гражданство"
              value={step4Data.personal.citizenship}
              onChange={(v) => setPersonal("citizenship", v)}
              placeholder="РФ"
            />
            <TextField
              label="Национальность"
              value={step4Data.personal.nationality}
              onChange={(v) => setPersonal("nationality", v)}
            />
            <SelectField
              label="Семейное положение"
              value={step4Data.personal.maritalStatus}
              onChange={(v) => setPersonal("maritalStatus", v)}
              options={familyOptions}
            />
            <TextField
              label="Текущий уровень дохода (в месяц)"
              value={step4Data.personal.currentIncome}
              onChange={(v) => setPersonal("currentIncome", v)}
              placeholder="например, 150 000"
            />
            <TextField
              label="Желаемый уровень дохода (в месяц)"
              value={step4Data.personal.desiredIncome}
              onChange={(v) => setPersonal("desiredIncome", v)}
              placeholder="например, 250 000"
            />
            <TextareaField
              label="Адрес проживания"
              value={step4Data.personal.address}
              onChange={(v) => setPersonal("address", v)}
              placeholder="г. ..., ул. ..."
            />
            <SelectField
              label="Адрес проживания по отношению к работе"
              value={step4Data.personal.workCommute}
              onChange={(v) => setPersonal("workCommute", v)}
              options={workCommuteOptions}
            />
            <SelectField
              label="Время в дороге"
              value={step4Data.personal.travelTime}
              onChange={(v) => setPersonal("travelTime", v)}
              options={travelTimeOptions}
            />
            <SelectField
              label="Придерживаетесь ли Вы религиозных требований"
              value={step4Data.personal.religiousRequirements}
              onChange={(v) => setPersonal("religiousRequirements", v)}
              options={religiousOptions}
            />
            <SelectField
              label="Право собственности жилого помещения"
              value={step4Data.personal.housingOwnership}
              onChange={(v) => setPersonal("housingOwnership", v)}
              options={housingOptions}
            />
            <YesNoField
              label="Есть ли родители пожилого возраста, требующие помощи"
              value={step4Data.personal.hasElderlyParents}
              onChange={(v) => setPersonal("hasElderlyParents", v)}
            />
            <TextField
              label="Число людей на Вашем полном обеспечении"
              value={step4Data.personal.dependentsCount}
              onChange={(v) => {
                if (parseDependentsCount(v) === 0) {
                  update({
                    personal: {
                      ...step4Data.personal,
                      dependentsCount: v,
                      dependentsDescription: "",
                    },
                  });
                  return;
                }
                setPersonal("dependentsCount", v);
              }}
              placeholder="2 (если обеспечиваете только себя, то 0)"
            />
            {parseDependentsCount(step4Data.personal.dependentsCount) > 0 ? (
              <TextareaField
                label="Кто находится на Вашем обеспечении"
                value={step4Data.personal.dependentsDescription}
                onChange={(v) => setPersonal("dependentsDescription", v)}
                placeholder="например, ребёнок, муж, пенсионер"
              />
            ) : null}
            <TextField
              label="Число детей"
              value={step4Data.personal.childrenCount}
              onChange={(v) => setPersonal("childrenCount", v)}
              placeholder="0, если детей нет"
            />
            <TextField
              label="Дата(ы) рождения детей"
              value={step4Data.personal.childrenBirthDates}
              onChange={(v) => setPersonal("childrenBirthDates", v)}
              placeholder="например, 11.08.2019; 02.02.2024"
            />
            <YesNoField
              label="Судимость"
              value={step4Data.personal.hasCriminalRecord}
              onChange={(v) => setPersonal("hasCriminalRecord", v)}
            />
            <SelectField
              label="Вредные привычки"
              value={step4Data.personal.badHabits}
              onChange={(v) => setPersonal("badHabits", v)}
              options={badHabitsOptions}
            />
            <TextField
              label="Размер кредитов в количестве среднемесячных зарплат"
              value={step4Data.personal.creditSalaries}
              onChange={(v) => setPersonal("creditSalaries", v)}
              placeholder="например, 5"
            />
            <TextField
              label="Размер кредитов, взятых у компании, в зарплатах"
              value={step4Data.personal.companyCreditSalaries}
              onChange={(v) => setPersonal("companyCreditSalaries", v)}
              placeholder="0, если нет"
            />
          </div>
        </div>

        {/* Образование */}
        <div
          id={STEP4_REQUIRED_SECTION_DOM_IDS.education}
          className={step4RequiredSectionClassName(
            step4HighlightSectionId,
            STEP4_REQUIRED_SECTION_DOM_IDS.education,
            `${questionCardSurfaceClass} mt-6 p-6 sm:px-8 sm:py-6`
          )}
        >
          <h2 className={sectionTitleClass}>Образование</h2>
          <div className={fieldRowClass}>
            <SelectField
              label="Уровень образования"
              value={step4Data.educationLevel}
              onChange={(v) => update({ educationLevel: v })}
              options={educationLevelOptions}
            />
          </div>
          <h3 className={subSectionTitleClass}>Какие учебные заведения Вы окончили?</h3>
          {step4Data.educationEntries.map((entry, idx) => (
            <div
              key={idx}
              className="mb-3 rounded-md border border-[#E2E2E2] p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] text-[#5F5E5E]">
                  Запись №{idx + 1}
                </span>
                {step4Data.educationEntries.length > 1 ? (
                  <button
                    type="button"
                    className={removeBtnClass}
                    onClick={() =>
                      update({
                        educationEntries: step4Data.educationEntries.filter(
                          (_, i) => i !== idx
                        ),
                      })
                    }
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
              <div className={fieldRowClass}>
                <TextField
                  label="Год поступления"
                  value={entry.yearStart}
                  onChange={(v) =>
                    update({
                      educationEntries: updateArrayItem(
                        step4Data.educationEntries,
                        idx,
                        { yearStart: v }
                      ),
                    })
                  }
                  placeholder="2004"
                />
                <TextField
                  label="Год окончания"
                  value={entry.yearEnd}
                  onChange={(v) =>
                    update({
                      educationEntries: updateArrayItem(
                        step4Data.educationEntries,
                        idx,
                        { yearEnd: v }
                      ),
                    })
                  }
                  placeholder="2009"
                />
                <TextField
                  label="Полное название учебного заведения"
                  value={entry.institution}
                  onChange={(v) =>
                    update({
                      educationEntries: updateArrayItem(
                        step4Data.educationEntries,
                        idx,
                        { institution: v }
                      ),
                    })
                  }
                  placeholder="ННГУ им. Лобачевского"
                />
                <TextField
                  label="Специальность, квалификация"
                  value={entry.specialty}
                  onChange={(v) =>
                    update({
                      educationEntries: updateArrayItem(
                        step4Data.educationEntries,
                        idx,
                        { specialty: v }
                      ),
                    })
                  }
                  placeholder="Психолог. Общая психология."
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className={addBtnClass}
            disabled={step4Data.educationEntries.length >= STEP4_MAX_EDUCATION_ENTRIES}
            onClick={() =>
              update({
                educationEntries: [
                  ...step4Data.educationEntries,
                  createEmptyEducationEntry(),
                ],
              })
            }
          >
            + Добавить учебное заведение (до {STEP4_MAX_EDUCATION_ENTRIES})
          </button>
        </div>

        {/* Курсы / повышение квалификации / сертификаты */}
        <div className={`${questionCardSurfaceClass} mt-6 p-6 sm:px-8 sm:py-6`}>
          <h2 className={sectionTitleClass}>
            Курсы переподготовки и повышения квалификации, дипломы и сертификаты
          </h2>
          {step4Data.courses.length === 0 ? (
            <p className="text-[13px] text-[#5F5E5E]">
              Пока нет записей. Нажмите «Добавить» ниже, если у Вас есть что
              указать (до {STEP4_MAX_COURSES} записей).
            </p>
          ) : null}
          {step4Data.courses.map((entry, idx) => (
            <div key={idx} className="mb-3 rounded-md border border-[#E2E2E2] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] text-[#5F5E5E]">Запись №{idx + 1}</span>
                <button
                  type="button"
                  className={removeBtnClass}
                  onClick={() =>
                    update({
                      courses: step4Data.courses.filter((_, i) => i !== idx),
                    })
                  }
                >
                  Удалить
                </button>
              </div>
              <div className={fieldRowClass}>
                <TextField
                  label="Сроки обучения"
                  value={entry.period}
                  onChange={(v) =>
                    update({
                      courses: updateArrayItem(step4Data.courses, idx, {
                        period: v,
                      }),
                    })
                  }
                  placeholder="например, сентябрь 2023 — март 2024"
                />
                <TextField
                  label="Длительность"
                  value={entry.duration}
                  onChange={(v) =>
                    update({
                      courses: updateArrayItem(step4Data.courses, idx, {
                        duration: v,
                      }),
                    })
                  }
                  placeholder="6 месяцев / 72 часа"
                />
                <TextareaField
                  label="Название учебного заведения и курса"
                  value={entry.institutionAndCourse}
                  onChange={(v) =>
                    update({
                      courses: updateArrayItem(step4Data.courses, idx, {
                        institutionAndCourse: v,
                      }),
                    })
                  }
                  rows={2}
                />
                <SelectField
                  label="Кто оплачивал обучение"
                  value={entry.paidBy}
                  onChange={(v) =>
                    update({
                      courses: updateArrayItem(step4Data.courses, idx, {
                        paidBy: v,
                      }),
                    })
                  }
                  options={paidByOptions}
                />
                <SelectField
                  label="Наличие диплома или сертификата"
                  value={entry.document}
                  onChange={(v) =>
                    update({
                      courses: updateArrayItem(step4Data.courses, idx, {
                        document: v,
                      }),
                    })
                  }
                  options={courseDocumentOptions}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className={addBtnClass}
            disabled={step4Data.courses.length >= STEP4_MAX_COURSES}
            onClick={() =>
              update({ courses: [...step4Data.courses, createEmptyCourseEntry()] })
            }
          >
            + Добавить курс / сертификат (до {STEP4_MAX_COURSES})
          </button>
        </div>

        {/* Текущее место работы */}
        <div
          id={STEP4_REQUIRED_SECTION_DOM_IDS.currentWork}
          className={step4RequiredSectionClassName(
            step4HighlightSectionId,
            STEP4_REQUIRED_SECTION_DOM_IDS.currentWork,
            `${questionCardSurfaceClass} mt-6 p-6 sm:px-8 sm:py-6`
          )}
        >
          <h2 className={sectionTitleClass}>Текущее место работы</h2>
          <WorkPlaceFields
            data={step4Data.currentWork}
            onChange={(k, v) => setCurrentWork(k, v)}
            isCurrent
          />
        </div>

        {/* Предыдущие места работы */}
        <div className={`${questionCardSurfaceClass} mt-6 p-6 sm:px-8 sm:py-6`}>
          <h2 className={sectionTitleClass}>Предыдущие места работы</h2>
          <p className="mb-3 text-[14px] font-semibold leading-snug text-[#C0392B]">
            Внимание. Максимально подробно перечислите все должности и
            организации, где Вы работали с возраста 20 лет, начиная с самого
            недавнего и заканчивая самым ранним. Это имеет большое значение для
            проектирования Вашего профессионального роста. Не торопитесь, время
            ответов не ограничено.
          </p>
          <p className="mb-3 text-[13px] text-[#5F5E5E]">
            До {STEP4_MAX_PREVIOUS_WORK} записей.
          </p>
          {step4Data.previousWork.map((entry, idx) => (
            <div key={idx} className="mb-3 rounded-md border border-[#E2E2E2] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] text-[#5F5E5E]">
                  Предыдущее место работы №{idx + 1}
                </span>
                <button
                  type="button"
                  className={removeBtnClass}
                  onClick={() =>
                    update({
                      previousWork: step4Data.previousWork.filter(
                        (_, i) => i !== idx
                      ),
                    })
                  }
                >
                  Удалить
                </button>
              </div>
              <WorkPlaceFields
                data={entry}
                onChange={(k, v) =>
                  update({
                    previousWork: updateArrayItem(
                      step4Data.previousWork,
                      idx,
                      { [k]: v } as Partial<Step4WorkPlace>
                    ),
                  })
                }
              />
            </div>
          ))}
          <button
            type="button"
            className={addBtnClass}
            disabled={step4Data.previousWork.length >= STEP4_MAX_PREVIOUS_WORK}
            onClick={() =>
              update({
                previousWork: [
                  ...step4Data.previousWork,
                  createEmptyWorkPlace(),
                ],
              })
            }
          >
            + Добавить место предыдущей работы (до {STEP4_MAX_PREVIOUS_WORK})
          </button>
        </div>

        {/* Специальный опыт */}
        <div className={`${questionCardSurfaceClass} mt-6 p-6 sm:px-8 sm:py-6`}>
          <h2 className={sectionTitleClass}>Специальный опыт по направлениям</h2>
          <p className="mb-3 text-[13px] text-[#5F5E5E]">
            Укажите свою роль и условия работы по перечисленным направлениям. Если
            опыта нет — оставьте пустым.
          </p>
          {specialExperienceDirections.map((direction, idx) => {
            const item =
              step4Data.specialExperience[idx] ?? createEmptySpecialExperience();
            const onPatch = (patch: Partial<Step4SpecialExperienceEntry>): void => {
              const next: Step4SpecialExperienceEntry[] = Array.from(
                { length: specialExperienceDirections.length },
                (_, i) =>
                  step4Data.specialExperience[i] ?? createEmptySpecialExperience()
              );
              next[idx] = { ...next[idx], ...patch, direction };
              update({
                specialExperience: next.slice(0, STEP4_MAX_SPECIAL_EXPERIENCE),
              });
            };
            return (
              <div
                key={idx}
                className="mb-3 rounded-md border border-[#E2E2E2] p-3"
              >
                <p className="mb-2 text-[14px] font-medium text-[#1B1B1B]">
                  {direction}
                </p>
                <div className={fieldRowClass}>
                  <SelectField
                    label="В качестве (роль)"
                    value={item.role}
                    onChange={(v) => onPatch({ role: v })}
                    options={specialRoleOptions}
                  />
                  <SelectField
                    label="В рамках проекта"
                    value={item.withinProject}
                    onChange={(v) => onPatch({ withinProject: v })}
                    options={specialWithinProjectOptions}
                  />
                  <SelectField
                    label="Длительность работ"
                    value={item.duration}
                    onChange={(v) => onPatch({ duration: v })}
                    options={specialDurationOptions}
                  />
                  <TextField
                    label="Наименование организации"
                    value={item.organization}
                    onChange={(v) => onPatch({ organization: v })}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Выставки/конференции */}
        <div className={`${questionCardSurfaceClass} mt-6 p-6 sm:px-8 sm:py-6`}>
          <h2 className={sectionTitleClass}>Выставки и конференции</h2>
          {step4Data.conferences.map((entry, idx) => (
            <ListRow
              key={idx}
              title={`Запись №${idx + 1}`}
              onRemove={() =>
                update({
                  conferences: step4Data.conferences.filter((_, i) => i !== idx),
                })
              }
            >
              <div className={fieldRowThreeClass}>
                <TextField
                  label="Название"
                  value={entry.name}
                  onChange={(v) =>
                    update({
                      conferences: updateArrayItem(
                        step4Data.conferences,
                        idx,
                        { name: v }
                      ),
                    })
                  }
                />
                <TextField
                  label="Место проведения"
                  value={entry.place}
                  onChange={(v) =>
                    update({
                      conferences: updateArrayItem(
                        step4Data.conferences,
                        idx,
                        { place: v }
                      ),
                    })
                  }
                />
                <TextField
                  label="Дата"
                  value={entry.date}
                  onChange={(v) =>
                    update({
                      conferences: updateArrayItem(
                        step4Data.conferences,
                        idx,
                        { date: v }
                      ),
                    })
                  }
                  placeholder="например, 06.2024"
                />
              </div>
            </ListRow>
          ))}
          <button
            type="button"
            className={addBtnClass}
            disabled={step4Data.conferences.length >= STEP4_MAX_CONFERENCES}
            onClick={() =>
              update({
                conferences: [
                  ...step4Data.conferences,
                  createEmptyConferenceEntry(),
                ],
              })
            }
          >
            + Добавить выставку/конференцию (до {STEP4_MAX_CONFERENCES})
          </button>
        </div>

        {/* Литература */}
        <div className={`${questionCardSurfaceClass} mt-6 p-6 sm:px-8 sm:py-6`}>
          <h2 className={sectionTitleClass}>
            Профессиональная и художественная литература
          </h2>
          {step4Data.literature.map((entry, idx) => (
            <ListRow
              key={idx}
              title={`Запись №${idx + 1}`}
              onRemove={() =>
                update({
                  literature: step4Data.literature.filter((_, i) => i !== idx),
                })
              }
            >
              <div className={fieldRowThreeClass}>
                <TextField
                  label="Название книги, журнала"
                  value={entry.title}
                  onChange={(v) =>
                    update({
                      literature: updateArrayItem(step4Data.literature, idx, {
                        title: v,
                      }),
                    })
                  }
                />
                <TextField
                  label="Автор"
                  value={entry.author}
                  onChange={(v) =>
                    update({
                      literature: updateArrayItem(step4Data.literature, idx, {
                        author: v,
                      }),
                    })
                  }
                />
                <TextField
                  label="Дата прочтения"
                  value={entry.date}
                  onChange={(v) =>
                    update({
                      literature: updateArrayItem(step4Data.literature, idx, {
                        date: v,
                      }),
                    })
                  }
                  placeholder="2025"
                />
              </div>
            </ListRow>
          ))}
          <button
            type="button"
            className={addBtnClass}
            disabled={step4Data.literature.length >= STEP4_MAX_LITERATURE}
            onClick={() =>
              update({
                literature: [
                  ...step4Data.literature,
                  createEmptyLiteratureEntry(),
                ],
              })
            }
          >
            + Добавить книгу (до {STEP4_MAX_LITERATURE})
          </button>
        </div>

        {/* Языки */}
        <div className={`${questionCardSurfaceClass} mt-6 p-6 sm:px-8 sm:py-6`}>
          <h2 className={sectionTitleClass}>Иностранные языки</h2>
          {step4Data.languages.map((entry, idx) => (
            <ListRow
              key={idx}
              title={`Язык №${idx + 1}`}
              onRemove={() =>
                update({
                  languages: step4Data.languages.filter((_, i) => i !== idx),
                })
              }
            >
              <div className={fieldRowClass}>
                <TextField
                  label="Язык"
                  value={entry.language}
                  onChange={(v) =>
                    update({
                      languages: updateArrayItem(step4Data.languages, idx, {
                        language: v,
                      }),
                    })
                  }
                  placeholder="английский"
                />
                <SelectField
                  label="Уровень владения"
                  value={entry.level}
                  onChange={(v) =>
                    update({
                      languages: updateArrayItem(step4Data.languages, idx, {
                        level: v,
                      }),
                    })
                  }
                  options={languageLevelOptions}
                />
              </div>
            </ListRow>
          ))}
          <button
            type="button"
            className={addBtnClass}
            disabled={step4Data.languages.length >= STEP4_MAX_LANGUAGES}
            onClick={() =>
              update({
                languages: [
                  ...step4Data.languages,
                  createEmptyLanguageEntry(),
                ],
              })
            }
          >
            + Добавить язык (до {STEP4_MAX_LANGUAGES})
          </button>
        </div>

        {/* Социальные сети */}
        <div className={`${questionCardSurfaceClass} mt-6 p-6 sm:px-8 sm:py-6`}>
          <h2 className={sectionTitleClass}>Социальные сети</h2>
          {step4Data.socialMedia.map((entry, idx) => (
            <ListRow
              key={idx}
              title={`Соцсеть №${idx + 1}`}
              onRemove={() =>
                update({
                  socialMedia: step4Data.socialMedia.filter((_, i) => i !== idx),
                })
              }
            >
              <div className={fieldRowClass}>
                <TextField
                  label="Социальная сеть"
                  value={entry.network}
                  onChange={(v) =>
                    update({
                      socialMedia: updateArrayItem(step4Data.socialMedia, idx, {
                        network: v,
                      }),
                    })
                  }
                  placeholder="Instagram, ВКонтакте, ..."
                />
                <TextField
                  label="Логин или иной идентификатор"
                  value={entry.identifier}
                  onChange={(v) =>
                    update({
                      socialMedia: updateArrayItem(step4Data.socialMedia, idx, {
                        identifier: v,
                      }),
                    })
                  }
                />
              </div>
            </ListRow>
          ))}
          <button
            type="button"
            className={addBtnClass}
            disabled={step4Data.socialMedia.length >= STEP4_MAX_SOCIAL_MEDIA}
            onClick={() =>
              update({
                socialMedia: [
                  ...step4Data.socialMedia,
                  createEmptySocialMedia(),
                ],
              })
            }
          >
            + Добавить соцсеть (до {STEP4_MAX_SOCIAL_MEDIA})
          </button>
          <p className="mt-3 text-[12px] italic text-[#5F5E5E]">
            Instagram (Meta) — запрещённая организация на территории РФ.
          </p>
        </div>

        {/* Онлайн-игры */}
        <div className={`${questionCardSurfaceClass} mt-6 p-6 sm:px-8 sm:py-6`}>
          <h2 className={sectionTitleClass}>Онлайн-игры</h2>
          {step4Data.onlineGames.map((entry, idx) => (
            <ListRow
              key={idx}
              title={`Игра №${idx + 1}`}
              onRemove={() =>
                update({
                  onlineGames: step4Data.onlineGames.filter((_, i) => i !== idx),
                })
              }
            >
              <div className={fieldRowClass}>
                <TextField
                  label="Название онлайн-игры"
                  value={entry.name}
                  onChange={(v) =>
                    update({
                      onlineGames: updateArrayItem(step4Data.onlineGames, idx, {
                        name: v,
                      }),
                    })
                  }
                />
                <TextField
                  label="Логин или иной идентификатор"
                  value={entry.identifier}
                  onChange={(v) =>
                    update({
                      onlineGames: updateArrayItem(step4Data.onlineGames, idx, {
                        identifier: v,
                      }),
                    })
                  }
                />
              </div>
            </ListRow>
          ))}
          <button
            type="button"
            className={addBtnClass}
            disabled={step4Data.onlineGames.length >= STEP4_MAX_ONLINE_GAMES}
            onClick={() =>
              update({
                onlineGames: [
                  ...step4Data.onlineGames,
                  createEmptyOnlineGame(),
                ],
              })
            }
          >
            + Добавить онлайн-игру (до {STEP4_MAX_ONLINE_GAMES})
          </button>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            aria-disabled={!complete}
            className={`${stepNavPrimaryButtonClass} ${
              complete ? "" : "!cursor-pointer !bg-[#B0CEC6] !text-white hover:!opacity-95"
            }`}
            onClick={() => {
              if (complete) {
                queueScreeningStepSync(4);
                if (tuBatteryMode && batteryStepSequence !== null) {
                  markStepCompleted(BATTERY_PROF_SB_STEP_MARKER);
                  const nextRoute = getBatteryNextRouteAfterStep(
                    batteryStepSequence,
                    BATTERY_PROF_SB_STEP_MARKER
                  );
                  if (nextRoute !== null) {
                    navigateAfterFormPersist(router, nextRoute);
                    return;
                  }
                  navigateAfterFormPersist(router, "/audit/finish");
                  return;
                }
                router.push("/finish");
                return;
              }
              const id = getFirstIncompleteStep4SectionDomId(step4Data);
              if (!id) {
                return;
              }
              setStep4HighlightSectionId(id);
              scheduleStep4HighlightClear();
              window.requestAnimationFrame(() => {
                document.getElementById(id)?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              });
            }}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </StepLayout>
  );
}

function ListRow(props: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="mb-3 rounded-md border border-[#E2E2E2] p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] text-[#5F5E5E]">{props.title}</span>
        <button type="button" className={removeBtnClass} onClick={props.onRemove}>
          Удалить
        </button>
      </div>
      {props.children}
    </div>
  );
}

function WorkPlaceFields(props: {
  data: Step4WorkPlace;
  onChange: <K extends keyof Step4WorkPlace>(key: K, value: Step4WorkPlace[K]) => void;
  isCurrent?: boolean;
}): React.ReactElement {
  const { data, onChange, isCurrent } = props;
  return (
    <div className={fieldRowClass}>
      <TextField
        label="Название организации"
        value={data.organization}
        onChange={(v) => onChange("organization", v)}
      />
      <TextField
        label="Город"
        value={data.city}
        onChange={(v) => onChange("city", v)}
      />
      <SelectField
        label="Сфера деятельности"
        value={data.field}
        onChange={(v) => onChange("field", v)}
        options={fieldOptions}
      />
      <TextField
        label="Должность"
        value={data.position}
        onChange={(v) => onChange("position", v)}
      />
      <SelectField
        label="Уровень должности"
        value={data.positionLevel}
        onChange={(v) => onChange("positionLevel", v)}
        options={positionLevelOptions}
      />
      <TextField
        label="Дата начала работы"
        value={data.startDate}
        onChange={(v) => onChange("startDate", v)}
        placeholder="например, 05.2024"
      />
      {isCurrent ? null : (
        <TextField
          label="Дата окончания работы"
          value={data.endDate}
          onChange={(v) => onChange("endDate", v)}
          placeholder="например, 07.2023"
        />
      )}
      <YesNoField
        label="Должность совпадает со специализацией по образованию"
        value={data.matchesEducation}
        onChange={(v) => onChange("matchesEducation", v)}
      />
      <TextField
        label="Число подчинённых"
        value={data.subordinates}
        onChange={(v) => onChange("subordinates", v)}
      />
      <TextField
        label="Общее число сотрудников в организации"
        value={data.totalEmployees}
        onChange={(v) => onChange("totalEmployees", v)}
      />
      <TextareaField
        label="Должностные обязанности"
        value={data.duties}
        onChange={(v) => onChange("duties", v)}
        rows={4}
      />
      <TextareaField
        label="Достижения"
        value={data.achievements}
        onChange={(v) => onChange("achievements", v)}
        rows={3}
      />
      {isCurrent ? null : (
        <TextareaField
          label="Причина окончания работ"
          value={data.leaveReason}
          onChange={(v) => onChange("leaveReason", v)}
          rows={2}
        />
      )}
    </div>
  );
}
