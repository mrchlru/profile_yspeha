"use client";

import React, { useState } from "react";

import { adminInputClass, adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";
import {
  surveyMutedTextClass,
  surveyOutlineButtonClass,
  surveyPrimaryButtonClass,
  surveyQuestionCardClass,
} from "@/lib/survey/surveyConstructorTheme";
import type {
  SurveyMode,
  SurveyScaleDefinition,
  SurveySchemaDocument,
  SurveyThresholdBand,
} from "@/lib/survey/surveyTypes";

type SurveyScalesPanelProps = {
  mode: SurveyMode;
  schema: SurveySchemaDocument;
  onPatchSchema: (updater: (schema: SurveySchemaDocument) => SurveySchemaDocument) => void;
};

const DEFAULT_BANDS: SurveyThresholdBand[] = [
  {
    from: 0,
    to: 6,
    zone: "normal",
    managerText: "Показатели в норме.",
  },
  {
    from: 7,
    to: 12,
    zone: "attention",
    managerText: "Зона внимания — обсудите с сотрудником.",
  },
  {
    from: 13,
    to: 18,
    zone: "risk",
    managerText: "Повышенный риск — нужны меры.",
  },
];

/**
 * Вкладка «Шкалы и баллы»: шкалы, пороги и подсказка для режима теста.
 */
export function SurveyScalesPanel({
  mode,
  schema,
  onPatchSchema,
}: SurveyScalesPanelProps): React.ReactElement {
  const [activeScaleId, setActiveScaleId] = useState<string | null>(schema.scales[0]?.id ?? null);
  const activeScale = schema.scales.find((s) => s.id === activeScaleId) ?? schema.scales[0] ?? null;
  const thresholds =
    schema.scoreThresholds.length > 0 ? schema.scoreThresholds : DEFAULT_BANDS;

  function addScale(): void {
    const scale: SurveyScaleDefinition = {
      id: crypto.randomUUID(),
      title: `Шкала ${String(schema.scales.length + 1)}`,
      aggregation: "sum",
    };
    onPatchSchema((s) => ({
      ...s,
      scales: [...s.scales, scale],
      scaleThresholds: { ...s.scaleThresholds, [scale.id]: DEFAULT_BANDS },
    }));
    setActiveScaleId(scale.id);
  }

  function updateScale(scaleId: string, patch: Partial<SurveyScaleDefinition>): void {
    onPatchSchema((s) => ({
      ...s,
      scales: s.scales.map((sc) => (sc.id === scaleId ? { ...sc, ...patch } : sc)),
    }));
  }

  function removeScale(scaleId: string): void {
    onPatchSchema((s) => {
      const nextThresholds = { ...s.scaleThresholds };
      delete nextThresholds[scaleId];
      return {
        ...s,
        scales: s.scales.filter((sc) => sc.id !== scaleId),
        scaleThresholds: nextThresholds,
        questions: s.questions.map((q) =>
          q.scaleKey === scaleId ? { ...q, scaleKey: null } : q
        ),
      };
    });
    if (activeScaleId === scaleId) {
      setActiveScaleId(null);
    }
  }

  function updateScoreThresholds(next: SurveyThresholdBand[]): void {
    onPatchSchema((s) => ({ ...s, scoreThresholds: next }));
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 space-y-2 rounded-[16px] border border-[#E5E5E5] bg-white p-4 lg:w-[280px]">
        <h2 className="m-0 text-[16px] font-extrabold text-[#1D1D1F]">Шкалы опроса</h2>
        {mode === "survey" ? (
          <p className={`text-[13px] ${surveyMutedTextClass}`}>
            Для опроса без оценки шкалы необязательны. Добавьте их, если считаете индексы по группам
            вопросов.
          </p>
        ) : (
          <p className={`text-[13px] ${surveyMutedTextClass}`}>
            Для <strong>теста</strong> отметьте правильные ответы в каждом вопросе на вкладке
            «Вопросы». Здесь — шкалы и пороги интерпретации.
          </p>
        )}
        {schema.scales.map((scale) => (
          <button
            key={scale.id}
            type="button"
            className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left ${
              activeScale?.id === scale.id
                ? "border-[#007A68] bg-[#F1F8F6]"
                : "border-[#E5E5E5] bg-white"
            }`}
            onClick={() => setActiveScaleId(scale.id)}
          >
            <span className="mt-1 size-2 shrink-0 rounded-full bg-[#007A68]" />
            <span>
              <span className="block text-[14px] font-bold">{scale.title}</span>
              <span className={`block text-[12px] ${surveyMutedTextClass}`}>
                {scale.aggregation === "sum" ? "Сумма баллов" : "Среднее"}
              </span>
            </span>
          </button>
        ))}
        <button type="button" className={surveyOutlineButtonClass} onClick={addScale}>
          + Новая шкала
        </button>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        {activeScale ? (
          <div className={`${surveyQuestionCardClass} space-y-4`}>
            <div className="flex flex-wrap items-end gap-4">
              <label className="min-w-[200px] flex-1">
                <span className={`mb-1 block text-[12px] font-bold ${surveyMutedTextClass}`}>
                  Название шкалы
                </span>
                <input
                  className={`${adminInputClass} border border-[#E5E5E5]`}
                  value={activeScale.title}
                  onChange={(e) => updateScale(activeScale.id, { title: e.target.value })}
                />
              </label>
              <label>
                <span className={`mb-1 block text-[12px] font-bold ${surveyMutedTextClass}`}>
                  Как считать
                </span>
                <select
                  className={`${adminInputClass} border border-[#E5E5E5]`}
                  value={activeScale.aggregation}
                  onChange={(e) =>
                    updateScale(activeScale.id, {
                      aggregation: e.target.value as "sum" | "average",
                    })
                  }
                >
                  <option value="sum">Сумма баллов</option>
                  <option value="average">Среднее</option>
                </select>
              </label>
              <button
                type="button"
                className="text-[13px] font-bold text-red-700"
                onClick={() => removeScale(activeScale.id)}
              >
                Удалить шкалу
              </button>
            </div>
            <p className={`text-[13px] ${surveyMutedTextClass}`}>
              Привязка: в карточке вопроса на вкладке «Вопросы» выберите шкалу для начисления
              баллов.
            </p>
          </div>
        ) : (
          <div className={`${surveyQuestionCardClass} ${surveyMutedTextClass}`}>
            Добавьте шкалу или выберите существующую слева.
          </div>
        )}

        <div className={`${surveyQuestionCardClass} space-y-3`}>
          <h3 className="m-0 text-[15px] font-extrabold">Пороги интерпретации (итоговый балл)</h3>
          {thresholds.map((band, index) => (
            <div key={`${String(band.from)}-${String(band.to)}`} className="grid gap-2 md:grid-cols-4">
              <input
                type="number"
                className={adminInputClass}
                value={band.from}
                onChange={(e) => {
                  const next = [...thresholds];
                  next[index] = { ...band, from: Number(e.target.value) };
                  updateScoreThresholds(next);
                }}
                aria-label="От"
              />
              <input
                type="number"
                className={adminInputClass}
                value={band.to}
                onChange={(e) => {
                  const next = [...thresholds];
                  next[index] = { ...band, to: Number(e.target.value) };
                  updateScoreThresholds(next);
                }}
                aria-label="До"
              />
              <select
                className={adminInputClass}
                value={band.zone}
                onChange={(e) => {
                  const next = [...thresholds];
                  next[index] = {
                    ...band,
                    zone: e.target.value as SurveyThresholdBand["zone"],
                  };
                  updateScoreThresholds(next);
                }}
              >
                <option value="normal">Норма</option>
                <option value="attention">Внимание</option>
                <option value="risk">Риск</option>
              </select>
              <input
                className={adminInputClass}
                value={band.managerText}
                onChange={(e) => {
                  const next = [...thresholds];
                  next[index] = { ...band, managerText: e.target.value };
                  updateScoreThresholds(next);
                }}
                placeholder="Текст для руководителя"
              />
            </div>
          ))}
          <button
            type="button"
            className={surveyPrimaryButtonClass}
            onClick={() =>
              updateScoreThresholds([
                ...thresholds,
                { from: 0, to: 0, zone: "normal", managerText: "" },
              ])
            }
          >
            Добавить порог
          </button>
        </div>

        {mode === "test" ? (
          <div className={`${surveyQuestionCardClass} space-y-2`}>
            <h3 className="m-0 text-[15px] font-extrabold">Ключ ответов (тест)</h3>
            <p className={adminPanelMutedTextClass}>
              Откройте каждый вопрос с вариантами на вкладке «Вопросы» и отметьте правильные
              ответы. Без этого публикация теста не пройдёт проверку.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
