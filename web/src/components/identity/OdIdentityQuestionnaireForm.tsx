"use client";

import React, { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import type { OdIdentityQuestionnaire } from "@/lib/identity/odIdentityTypes";
import { isOdIdentityQuestionnaireComplete } from "@/lib/identity/odIdentityCheck";
import {
  stepInputClass,
  stepLabelClass,
  stepNavPrimaryButtonClass,
  stepSecondaryTextClass,
} from "@/lib/stepPageTheme";

export type OdIdentityQuestionnaireFormProps = {
  initialLastName?: string;
  initialFirstName?: string;
  onSubmit: (questionnaire: OdIdentityQuestionnaire) => void;
};

type FormState = {
  lastName: string;
  firstName: string;
  middleName: string;
  fatherName: string;
  respondentBirthDate: string;
  hasChildren: boolean;
  childrenCount: number;
  childrenBirthDates: string[];
};

/**
 * Анкета идентичности перед батареей ОД / кадрового резерва.
 */
export function OdIdentityQuestionnaireForm({
  initialLastName = "",
  initialFirstName = "",
  onSubmit,
}: OdIdentityQuestionnaireFormProps): React.ReactElement {
  const [form, setForm] = useState<FormState>({
    lastName: initialLastName,
    firstName: initialFirstName,
    middleName: "",
    fatherName: "",
    respondentBirthDate: "",
    hasChildren: false,
    childrenCount: 1,
    childrenBirthDates: [""],
  });
  const [error, setError] = useState<string | null>(null);

  const previewQuestionnaire = useMemo((): OdIdentityQuestionnaire | null => {
    const dates =
      form.hasChildren && form.childrenCount > 0
        ? form.childrenBirthDates.slice(0, form.childrenCount)
        : [];
    const candidate: OdIdentityQuestionnaire = {
      lastName: form.lastName.trim(),
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim(),
      fatherName: form.fatherName.trim(),
      respondentBirthDate: form.respondentBirthDate,
      hasChildren: form.hasChildren,
      childrenCount: form.hasChildren ? form.childrenCount : 0,
      childrenBirthDates: dates,
      completedAt: new Date().toISOString(),
    };
    return isOdIdentityQuestionnaireComplete(candidate) ? candidate : null;
  }, [form]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function updateChildrenCount(count: number): void {
    const safe = Math.max(1, Math.min(10, count));
    setForm((prev) => {
      const nextDates = [...prev.childrenBirthDates];
      while (nextDates.length < safe) {
        nextDates.push("");
      }
      return {
        ...prev,
        childrenCount: safe,
        childrenBirthDates: nextDates.slice(0, safe),
      };
    });
    setError(null);
  }

  function updateChildBirthDate(index: number, value: string): void {
    setForm((prev) => {
      const nextDates = [...prev.childrenBirthDates];
      nextDates[index] = value;
      return { ...prev, childrenBirthDates: nextDates };
    });
    setError(null);
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (previewQuestionnaire === null) {
      setError("Заполните все обязательные поля анкеты.");
      return;
    }
    onSubmit(previewQuestionnaire);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className={`text-[15px] ${stepSecondaryTextClass}`}>
        Данные анкеты используются только во время этого прохождения для проверочных
        вопросов. В отчёты HR они не попадают.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="od-id-last-name" className={`block ${stepLabelClass}`}>
            Фамилия
          </label>
          <input
            id="od-id-last-name"
            type="text"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            className={`${stepInputClass} h-12 text-[16px]`}
          />
        </div>
        <div>
          <label htmlFor="od-id-first-name" className={`block ${stepLabelClass}`}>
            Имя
          </label>
          <input
            id="od-id-first-name"
            type="text"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            className={`${stepInputClass} h-12 text-[16px]`}
          />
        </div>
        <div>
          <label htmlFor="od-id-middle-name" className={`block ${stepLabelClass}`}>
            Отчество
          </label>
          <input
            id="od-id-middle-name"
            type="text"
            autoComplete="additional-name"
            value={form.middleName}
            onChange={(event) => updateField("middleName", event.target.value)}
            className={`${stepInputClass} h-12 text-[16px]`}
          />
        </div>
        <div>
          <label htmlFor="od-id-father-name" className={`block ${stepLabelClass}`}>
            Имя отца
          </label>
          <input
            id="od-id-father-name"
            type="text"
            value={form.fatherName}
            onChange={(event) => updateField("fatherName", event.target.value)}
            className={`${stepInputClass} h-12 text-[16px]`}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="od-id-birth-date" className={`block ${stepLabelClass}`}>
            Дата рождения
          </label>
          <input
            id="od-id-birth-date"
            type="date"
            value={form.respondentBirthDate}
            onChange={(event) => updateField("respondentBirthDate", event.target.value)}
            className={`${stepInputClass} h-12 text-[16px]`}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.hasChildren}
            onChange={(event) => updateField("hasChildren", event.target.checked)}
            className="h-5 w-5 rounded border-black/20"
          />
          <span className="text-[15px] font-semibold text-[#5F5E5E]">Есть дети</span>
        </label>

        {form.hasChildren ? (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="od-id-children-count" className={`block ${stepLabelClass}`}>
                Количество детей
              </label>
              <input
                id="od-id-children-count"
                type="number"
                min={1}
                max={10}
                value={form.childrenCount}
                onChange={(event) =>
                  updateChildrenCount(Number.parseInt(event.target.value, 10) || 1)
                }
                className={`${stepInputClass} h-12 w-32 text-[16px]`}
              />
            </div>
            {form.childrenBirthDates.slice(0, form.childrenCount).map((date, index) => (
              <div key={index}>
                <label
                  htmlFor={`od-id-child-birth-${String(index)}`}
                  className={`block ${stepLabelClass}`}
                >
                  Дата рождения ребёнка {index + 1}
                </label>
                <input
                  id={`od-id-child-birth-${String(index)}`}
                  type="date"
                  value={date}
                  onChange={(event) => updateChildBirthDate(index, event.target.value)}
                  className={`${stepInputClass} h-12 text-[16px]`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-[14px] font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className={`${stepNavPrimaryButtonClass} w-full sm:w-auto`}>
        Перейти к тестированию
      </Button>
    </form>
  );
}
