"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { adminInputClass, adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";
import { SurveyQuestionInspector } from "@/components/admin/surveys/SurveyQuestionInspector";
import { SurveyScalesPanel } from "@/components/admin/surveys/SurveyScalesPanel";
import { CustomSurveyPlayer } from "@/components/survey/CustomSurveyPlayer";
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
import {
  duplicateQuestionInSchema,
  moveQuestionInSchema,
  orderedSurveyQuestions,
  removeQuestionFromSchema,
} from "@/lib/survey/surveySchemaMutations";
import { surveyPublicLinkUrl } from "@/lib/survey/surveyPublicLink";
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
  const [collapsedQuestionIds, setCollapsedQuestionIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<SurveyDraftPayload | null>(null);
  const [pageOrigin, setPageOrigin] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  useEffect(() => {
    setPageOrigin(window.location.origin);
  }, []);

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
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    void loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- первичная загрузка
  }, [surveyId]);

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
      const sections = schema.sections.map((section, index) =>
        index === 0 ? { ...section, questionIds: [...section.questionIds, question.id] } : section
      );
      setCollapsedQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(question.id);
        return next;
      });
      return { ...schema, questions: [...schema.questions, question], sections };
    });
  }

  function toggleQuestionCollapsed(questionId: string): void {
    setCollapsedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  function setQuestion(questionId: string, next: SurveyQuestion): void {
    patchSchema((schema) => ({
      ...schema,
      questions: schema.questions.map((q) => (q.id === questionId ? next : q)),
    }));
  }

  function deleteQuestion(questionId: string): void {
    patchSchema((schema) => {
      const next = removeQuestionFromSchema(schema, questionId);
      setCollapsedQuestionIds((prev) => {
        const collapsed = new Set(prev);
        collapsed.delete(questionId);
        return collapsed;
      });
      return next;
    });
  }

  function duplicateQuestion(questionId: string): void {
    patchSchema((schema) => duplicateQuestionInSchema(schema, questionId));
  }

  function moveQuestion(questionId: string, direction: "up" | "down"): void {
    patchSchema((schema) => moveQuestionInSchema(schema, questionId, direction));
  }

  async function publishDraft(): Promise<void> {
    if (!draftRef.current) {
      return;
    }
    setPublishBusy(true);
    setError(null);
    setPublishNotice(null);
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
      const versionNumber = body.versionNumber ?? 1;
      setPublishedVersion(versionNumber);
      await loadDraft();
      const latest = draftRef.current;
      const kindLabel = latest?.mode === "test" ? "теста" : "опроса";
      if (
        latest?.settings.publicLinkEnabled &&
        latest.settings.publicLinkToken &&
        pageOrigin
      ) {
        const url = surveyPublicLinkUrl(pageOrigin, latest.settings.publicLinkToken);
        setPublishNotice(
          `Опубликована версия ${String(versionNumber)} ${kindLabel}. Общая ссылка та же — респонденты увидят актуальную версию после публикации. ${url}`
        );
      } else {
        setPublishNotice(`Опубликована версия ${String(versionNumber)} ${kindLabel}.`);
      }
    } catch {
      setError("Сеть недоступна при публикации");
    } finally {
      setPublishBusy(false);
    }
  }

  if (loading) {
    return <p className={adminPanelMutedTextClass}>Загрузка редактора…</p>;
  }

  if (!draft) {
    return (
      <div className={`${surveyQuestionCardClass} max-w-lg space-y-3 p-6`}>
        <h2 className="text-[18px] font-extrabold text-[#1D1D1F]">Опрос или тест не найден</h2>
        <p className={`text-[14px] ${surveyMutedTextClass}`}>
          {error ?? "Возможно, его удалили или ссылка устарела."}
        </p>
        <Link href="/admin/surveys" className={`${surveyOutlineButtonClass} inline-block`}>
          К списку опросов
        </Link>
      </div>
    );
  }

  const orderedQuestions = orderedSurveyQuestions(draft.schema);

  const publishLabel =
    publishedVersion !== null
      ? `Опубликовать версию ${String(publishedVersion + 1)}`
      : "Опубликовать версию 1";

  const saveHint =
    saveState === "saving"
      ? "сохранение…"
      : saveState === "saved"
        ? "сохранено"
        : saveState === "conflict"
          ? "конфликт версий"
          : "";

  return (
    <div className="-mx-2 flex flex-col sm:-mx-0">
      <header className="-mx-5 mb-0 border-b border-[#E5E5E5] bg-white sm:-mx-8 lg:-mx-12">
        <div className="relative mx-auto max-w-[900px] py-2.5 pl-3 pr-6 sm:pl-4">
          <Link
            href="/admin/surveys"
            className="absolute left-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-[20px] font-bold text-[#1D1D1F] no-underline hover:bg-[#F5F5F5]"
            aria-label="Назад к списку опросов"
            title="Назад"
          >
            ←
          </Link>

          <div className="flex flex-wrap items-center gap-3 pl-10 sm:pl-12">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-extrabold text-[#1D1D1F]">
                {draft.schema.title.trim() || "Без названия"}
              </p>
              <div className={`text-[12px] ${surveyMutedTextClass}`}>
                {draft.mode === "test" ? "Тест" : "Опрос"}
                {publishedVersion !== null
                  ? ` · опубликована версия ${String(publishedVersion)}`
                  : " · черновик"}
                {saveHint ? ` · ${saveHint}` : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={surveyOutlineButtonClass} onClick={() => setTab("preview")}>
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
        </div>
        <nav
          aria-label="Разделы редактора"
          className="mx-auto flex max-w-[900px] flex-wrap gap-1 px-6 pb-0 pl-12 sm:pl-14"
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
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 py-7 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          {publishNotice ? (
            <div
              className="rounded-xl border border-[#007A68]/30 bg-[#DDF1EC] px-4 py-3 text-[14px] leading-relaxed text-[#1D1D1F]"
              role="status"
            >
              {publishNotice}
            </div>
          ) : null}
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
              <section className={`${surveyQuestionCardClass} space-y-3`}>
                <label className="block">
                  <span className={`mb-1 block text-[12px] font-bold ${surveyMutedTextClass}`}>
                    Название для респондентов
                  </span>
                  <input
                    className="w-full border-0 bg-transparent p-0 text-[28px] font-extrabold tracking-[-0.02em] text-[#1D1D1F] outline-none placeholder:text-[#AEAEAE]"
                    value={draft.schema.title}
                    placeholder="Название опроса"
                    onChange={(e) =>
                      patchSchema((schema) => ({ ...schema, title: e.target.value }))
                    }
                  />
                </label>
                <textarea
                  className={`${adminInputClass} min-h-[80px] w-full border border-[#E5E5E5] bg-[#FAFAFA]`}
                  value={draft.schema.description ?? ""}
                  onChange={(e) =>
                    patchSchema((schema) => ({ ...schema, description: e.target.value }))
                  }
                  placeholder="Описание для респондентов"
                />
              </section>

              {orderedQuestions.length === 0 ? (
                <p className={`text-[14px] ${surveyMutedTextClass}`}>
                  Добавьте первый вопрос справа — «Короткий ответ», «Рейтинг» и другие.
                </p>
              ) : null}

              {orderedQuestions.map((question, index) => (
                <SurveyQuestionInspector
                  key={question.id}
                  mode={draft.mode}
                  schema={draft.schema}
                  question={question}
                  codeIndex={index + 1}
                  collapsed={collapsedQuestionIds.has(question.id)}
                  onToggleCollapsed={() => toggleQuestionCollapsed(question.id)}
                  onUpdate={setQuestion}
                  onDelete={deleteQuestion}
                  onDuplicate={duplicateQuestion}
                  onMove={moveQuestion}
                />
              ))}
            </div>
          ) : null}

          {tab === "scales" ? (
            <SurveyScalesPanel
              mode={draft.mode}
              schema={draft.schema}
              onPatchSchema={(updater) => patchSchema(updater)}
            />
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
              <label className="flex items-start gap-2 text-[14px]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={draft.settings.allowMultipleResponses}
                  onChange={(e) =>
                    patchSettings((settings) => ({
                      ...settings,
                      allowMultipleResponses: e.target.checked,
                    }))
                  }
                />
                <span>
                  Повторное прохождение по тому же коду приглашения
                  <span className={`mt-0.5 block text-[12px] ${surveyMutedTextClass}`}>
                    По умолчанию код одноразовый; новые коды всегда можно выдавать отдельно.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-[14px]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={draft.settings.publicLinkEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    patchSettings((settings) => {
                      const next = { ...settings, publicLinkEnabled: enabled };
                      if (enabled && !next.publicLinkToken) {
                        next.publicLinkToken = _randomPublicLinkToken();
                      }
                      return next;
                    });
                  }}
                />
                <span>
                  Общая ссылка для всех респондентов
                  <span className={`mt-0.5 block text-[12px] ${surveyMutedTextClass}`}>
                    Без персонального кода; каждый запуск «Начать опрос» создаёт новый ответ.
                  </span>
                </span>
              </label>
              {draft.settings.publicLinkEnabled && draft.settings.publicLinkToken ? (
                <div className="rounded-xl border border-[#E5E5E5] bg-[#F4F6F5] p-4">
                  <p className={`text-[12px] font-bold ${surveyMutedTextClass}`}>
                    {draft.status === "published"
                      ? "Ссылка активна после публикации этих настроек"
                      : "Сначала опубликуйте опрос, затем отправьте ссылку"}
                  </p>
                  <p className="mt-2 break-all text-[13px] font-semibold text-[#1D1D1F]">
                    {pageOrigin
                      ? surveyPublicLinkUrl(pageOrigin, draft.settings.publicLinkToken)
                      : "…"}
                  </p>
                  <button
                    type="button"
                    className={`${surveyOutlineButtonClass} mt-3`}
                    disabled={!pageOrigin || draft.status !== "published"}
                    onClick={() => {
                      if (!pageOrigin || !draft.settings.publicLinkToken) {
                        return;
                      }
                      void navigator.clipboard
                        .writeText(surveyPublicLinkUrl(pageOrigin, draft.settings.publicLinkToken))
                        .then(() => {
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        });
                    }}
                  >
                    {linkCopied ? "Скопировано" : "Скопировать ссылку"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "preview" ? (
            <div className="rounded-[14px] border border-[#E5E5E5] bg-[#F4F6F5] p-4 sm:p-6">
              <CustomSurveyPlayer schema={draft.schema} readOnly />
            </div>
          ) : null}
        </div>

        {tab === "questions" ? (
          <aside className="h-fit w-full shrink-0 space-y-2 rounded-[14px] border border-[#E5E5E5] bg-white p-4 lg:sticky lg:top-6 lg:z-10 lg:max-h-[calc(100dvh-3rem)] lg:w-[240px] lg:self-start lg:overflow-y-auto">
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

function _randomPublicLinkToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
