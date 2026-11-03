"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { adminInputClass, adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";
import {
  surveyEditorTabActiveClass,
  surveyEditorTabIdleClass,
  surveyMutedTextClass,
  surveyOutlineButtonClass,
  surveyPrimaryButtonClass,
  surveyQuestionCardClass,
} from "@/lib/survey/surveyConstructorTheme";
import { createSurveyQuestion } from "@/lib/survey/createSurveyQuestion";
import { countSurveyQuestions } from "@/lib/survey/countSurveyQuestions";
import {
  SURVEY_ADDABLE_QUESTION_TYPES,
  SURVEY_QUESTION_TYPE_LABELS,
} from "@/lib/survey/surveyQuestionTypeLabels";
import type {
  SurveyDraftPayload,
  SurveyQuestion,
  SurveyQuestionType,
  SurveySchemaDocument,
  SurveySettingsDocument,
} from "@/lib/survey/surveyTypes";

type EditorTab = "questions" | "scales" | "settings" | "preview";

type SurveyEditorPageClientProps = {
  surveyId: string;
};

/**
 * Редактор опроса: вкладки по макету, автосохранение черновика.
 */
export function SurveyEditorPageClient({ surveyId }: SurveyEditorPageClientProps): React.ReactElement {
  const [tab, setTab] = useState<EditorTab>("questions");
  const [draft, setDraft] = useState<SurveyDraftPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "conflict">("idle");
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<SurveyDraftPayload | null>(null);

  const loadDraft = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/surveys/${encodeURIComponent(surveyId)}/draft`);
      const body = (await res.json()) as SurveyDraftPayload & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось загрузить черновик");
        setDraft(null);
        return;
      }
      setDraft(body);
      draftRef.current = body;
      setPublishedVersion(body.currentVersionNumber);
      if (!activeQuestionId && body.schema.questions[0]) {
        setActiveQuestionId(body.schema.questions[0].id);
      }
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  const persistDraft = useCallback(async (payload: SurveyDraftPayload): Promise<void> => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/admin/surveys/${encodeURIComponent(surveyId)}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema: payload.schema,
          settings: payload.settings,
          revision: payload.revision,
        }),
      });
      const body = (await res.json()) as { revision?: number; error?: string };
      if (res.status === 409) {
        setSaveState("conflict");
        setError(body.error ?? "Конфликт версий");
        return;
      }
      if (!res.ok || body.revision === undefined) {
        setSaveState("idle");
        setError(body.error ?? "Не удалось сохранить");
        return;
      }
      const next: SurveyDraftPayload = { ...payload, revision: body.revision };
      setDraft(next);
      draftRef.current = next;
      setSaveState("saved");
    } catch {
      setSaveState("idle");
      setError("Сеть недоступна при сохранении");
    }
  }, [surveyId]);

  function scheduleSave(next: SurveyDraftPayload): void {
    draftRef.current = next;
    setDraft(next);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void persistDraft(next);
    }, 1000);
  }

  function patchSchema(updater: (schema: SurveySchemaDocument) => SurveySchemaDocument): void {
    const current = draftRef.current;
    if (!current) {
      return;
    }
    scheduleSave({ ...current, schema: updater(current.schema) });
  }

  function patchSettings(updater: (settings: SurveySettingsDocument) => SurveySettingsDocument): void {
    const current = draftRef.current;
    if (!current) {
      return;
    }
    scheduleSave({ ...current, settings: updater(current.settings) });
  }

  function addQuestion(type: SurveyQuestionType): void {
    patchSchema((schema) => {
      const codeIndex = countSurveyQuestions(schema) + 1;
      const question = createSurveyQuestion(type, codeIndex);
      const sectionId = schema.sections[0]?.id;
      const sections = schema.sections.map((section, index) =>
        index === 0 ? { ...section, questionIds: [...section.questionIds, question.id] } : section
      );
      if (!sectionId) {
        return schema;
      }
      setActiveQuestionId(question.id);
      return { ...schema, questions: [...schema.questions, question], sections };
    });
  }

  async function publishDraft(): Promise<void> {
    if (!draftRef.current) {
      return;
    }
    setPublishBusy(true);
    setError(null);
    try {
      await persistDraft(draftRef.current);
      const res = await fetch(`/api/admin/surveys/${encodeURIComponent(surveyId)}/publish`, {
        method: "POST",
      });
      const body = (await res.json()) as {
        versionNumber?: number;
        error?: string;
        issues?: Array<{ message: string }>;
      };
      if (!res.ok) {
        const detail =
          body.issues?.map((i) => i.message).join(" ") ?? body.error ?? "Не удалось опубликовать";
        setError(detail);
        return;
      }
      setPublishedVersion(body.versionNumber ?? null);
      await loadDraft();
    } catch {
      setError("Сеть недоступна при публикации");
    } finally {
      setPublishBusy(false);
    }
  }

  function updateQuestion(questionId: string, patch: Partial<SurveyQuestion>): void {
    patchSchema((schema) => ({
      ...schema,
      questions: schema.questions.map((q) =>
        q.id === questionId ? ({ ...q, ...patch } as SurveyQuestion) : q
      ),
    }));
  }

  if (loading) {
    return <p className={adminPanelMutedTextClass}>Загрузка редактора…</p>;
  }

  if (!draft) {
    return (
      <div>
        <p className="text-[14px] font-semibold text-red-700">{error ?? "Опрос не найден"}</p>
        <Link href="/admin/surveys" className={`${surveyOutlineButtonClass} mt-4 inline-block`}>
          К списку
        </Link>
      </div>
    );
  }

  const activeQuestion = draft.schema.questions.find((q) => q.id === activeQuestionId) ?? null;

  const publishLabel =
    publishedVersion !== null
      ? `Опубликовать версию ${String(publishedVersion + 1)}`
      : "Опубликовать версию 1";

  return (
    <div className="-mx-2 flex flex-col sm:-mx-0">
      <header className="-mx-5 mb-0 border-b border-[#E5E5E5] bg-white sm:-mx-8 lg:-mx-12">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-3 px-6 py-2.5">
          <Link
            href="/admin/surveys"
            className="inline-flex min-h-[44px] items-center text-[14px] font-bold text-[#1D1D1F] no-underline hover:text-[#007A68]"
          >
            ← К списку
          </Link>
          <div className="min-w-0 flex-1">
            <input
              className="w-full border-0 bg-transparent p-1 text-[18px] font-extrabold text-[#1D1D1F] outline-none"
              value={draft.schema.title}
              onChange={(e) =>
                patchSchema((schema) => ({ ...schema, title: e.target.value }))
              }
              aria-label="Название опроса"
            />
            <div className={`text-[12px] ${surveyMutedTextClass}`}>
              {draft.mode === "test" ? "Тест" : "Опрос"}
              {publishedVersion !== null ? ` · опубликована версия ${String(publishedVersion)}` : " · черновик"}
              {" · "}
              {saveState === "saving"
                ? "сохранение…"
                : saveState === "saved"
                  ? "сохранено"
                  : saveState === "conflict"
                    ? "конфликт версий"
                    : ""}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={surveyOutlineButtonClass}
              onClick={() => setTab("preview")}
            >
              Предпросмотр
            </button>
            {draft.status === "published" ? (
              <Link
                href={`/admin/create-test?surveyId=${encodeURIComponent(surveyId)}`}
                className={surveyOutlineButtonClass}
              >
                Выдать
              </Link>
            ) : null}
            <button
              type="button"
              disabled={publishBusy || draft.status === "archived"}
              className={surveyPrimaryButtonClass}
              onClick={() => void publishDraft()}
            >
              {publishBusy ? "Публикация…" : publishLabel}
            </button>
          </div>
        </div>
        <nav
          aria-label="Разделы редактора"
          className="mx-auto flex max-w-[900px] flex-wrap gap-1 px-6"
        >
          {(
            [
              ["questions", "Вопросы"],
              ["scales", "Шкалы и баллы"],
              ["settings", "Настройки"],
              ["preview", "Предпросмотр"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? surveyEditorTabActiveClass : surveyEditorTabIdleClass}
              onClick={() => setTab(id)}
            >
              {label}
              {id === "preview" && draft.responseCount > 0
                ? ` · ${String(draft.responseCount)}`
                : ""}
            </button>
          ))}
        </nav>
      </header>

    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 py-7 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">

        {error ? (
          <p className="text-[14px] font-semibold text-red-700">
            {error}{" "}
            {saveState === "conflict" ? (
              <button type="button" className="underline" onClick={() => void loadDraft()}>
                Загрузить свежую версию
              </button>
            ) : null}
          </p>
        ) : null}

        {tab === "questions" ? (
          <div className="space-y-4">
            <section className={`${surveyQuestionCardClass} space-y-2`}>
              <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">
                {draft.schema.title.trim() || "Без названия"}
              </h1>
              <textarea
                className={`${adminInputClass} min-h-[80px] w-full border border-[#E5E5E5] bg-[#FAFAFA]`}
                value={draft.schema.description ?? ""}
                onChange={(e) =>
                  patchSchema((schema) => ({ ...schema, description: e.target.value }))
                }
                placeholder="Описание для респондентов"
              />
            </section>

            {draft.schema.questions.map((question) => (
              <button
                key={question.id}
                type="button"
                className={`${surveyQuestionCardClass} block w-full p-4 text-left ${
                  activeQuestionId === question.id ? "ring-2 ring-[#007A68]" : ""
                }`}
                onClick={() => setActiveQuestionId(question.id)}
              >
                <p className="text-[12px] font-bold uppercase text-[var(--admin-text-3)]">
                  {question.code} · {SURVEY_QUESTION_TYPE_LABELS[question.type]}
                </p>
                <p className="mt-1 text-[15px] font-semibold text-[var(--admin-text)]">
                  {question.title.trim() || "Без текста"}
                </p>
              </button>
            ))}

            {activeQuestion ? (
              <div className={`${surveyQuestionCardClass} space-y-3`}>
                <label className="block">
                  <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>
                    Тип
                  </span>
                  <select
                    className={adminInputClass}
                    value={activeQuestion.type}
                    onChange={(e) =>
                      updateQuestion(activeQuestion.id, {
                        type: e.target.value as SurveyQuestionType,
                      })
                    }
                  >
                    {SURVEY_ADDABLE_QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {SURVEY_QUESTION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>
                    Текст вопроса
                  </span>
                  <textarea
                    className={`${adminInputClass} min-h-[72px] w-full`}
                    value={activeQuestion.title}
                    onChange={(e) => updateQuestion(activeQuestion.id, { title: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={Boolean(activeQuestion.required)}
                    onChange={(e) =>
                      updateQuestion(activeQuestion.id, { required: e.target.checked })
                    }
                  />
                  Обязательный вопрос
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "scales" ? (
          <div className={`${surveyQuestionCardClass}`}>
            <p className={adminPanelMutedTextClass}>
              Шкалы, пороги интерпретации и ключ ответов для режима «Тест» — следующий шаг
              реализации (этап 1 спецификации). Схема уже поддерживает поля{" "}
              <code className="text-[12px]">scales</code> и{" "}
              <code className="text-[12px]">scoreThresholds</code>.
            </p>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className={`${surveyQuestionCardClass} space-y-4`}>
            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={draft.settings.anonymous}
                onChange={(e) =>
                  patchSettings((settings) => ({ ...settings, anonymous: e.target.checked }))
                }
              />
              Анонимный опрос
            </label>
            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={draft.settings.proctorEnabled}
                onChange={(e) =>
                  patchSettings((settings) => ({ ...settings, proctorEnabled: e.target.checked }))
                }
              />
              Прокторинг (камера и микрофон)
            </label>
            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={draft.settings.shuffleQuestions}
                onChange={(e) =>
                  patchSettings((settings) => ({
                    ...settings,
                    shuffleQuestions: e.target.checked,
                  }))
                }
              />
              Перемешивать вопросы
            </label>
            <label className="block">
              <span className={`mb-1 block text-[13px] font-semibold ${adminPanelMutedTextClass}`}>
                Таймер (минуты, пусто — без лимита)
              </span>
              <input
                type="number"
                min={1}
                className={adminInputClass}
                value={draft.settings.timerMinutes ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  patchSettings((settings) => ({
                    ...settings,
                    timerMinutes: raw ? Number(raw) : null,
                  }));
                }}
              />
            </label>
          </div>
        ) : null}

        {tab === "preview" ? (
          <div className={`${surveyQuestionCardClass} space-y-3`}>
            <p className={surveyMutedTextClass}>
              Предпросмотр совпадает с экраном респондента после выдачи кода доступа.
            </p>
            <Link
              href={`/custom-survey/preview/${encodeURIComponent(surveyId)}`}
              className={surveyOutlineButtonClass}
              target="_blank"
              rel="noreferrer"
            >
              Открыть предпросмотр
            </Link>
          </div>
        ) : null}
      </div>

      {tab === "questions" ? (
        <aside className="h-fit w-full shrink-0 space-y-2 rounded-[14px] border border-[#E5E5E5] bg-white p-4 lg:w-[240px]">
          <p className="text-[13px] font-bold text-[#5F5E5E]">Добавить вопрос</p>
          {SURVEY_ADDABLE_QUESTION_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`${surveyOutlineButtonClass} w-full justify-start text-left text-[13px]`}
              onClick={() => addQuestion(type)}
            >
              {SURVEY_QUESTION_TYPE_LABELS[type]}
            </button>
          ))}
        </aside>
      ) : null}
    </div>
    </div>
  );
}
