"use client";

import React, { useCallback, useEffect, useState } from "react";

import { CreateInviteSuccessCard } from "@/components/admin/CreateInviteSuccessCard";
import {
  surveyCardClass,
  surveyMutedTextClass,
  surveyOutlineButtonClass,
  surveyPrimaryButtonClass,
  surveyTemplateActiveClass,
  surveyTemplateIdleClass,
  surveyTemplateTrackClass,
} from "@/lib/survey/surveyConstructorTheme";
import { buildInviteCopyMessage, inviteEntryUrl } from "@/lib/access/inviteMessage";
import { surveyPublicLinkUrl } from "@/lib/survey/surveyPublicLink";
import { formatInviteValidThroughRu } from "@/lib/access/inviteValidity";
import type { SurveyMode } from "@/lib/survey/surveyTypes";

type PublishedSurveyRow = {
  id: string;
  title: string;
  mode: SurveyMode;
  versionNumber: number;
  questionCount: number;
};

type CustomSurveyAssignPanelProps = {
  initialSurveyId?: string | null;
};

/**
 * Выдача приглашений на собственные опросы (вкладка «Создать тестирование»).
 */
export function CustomSurveyAssignPanel({
  initialSurveyId,
}: CustomSurveyAssignPanelProps): React.ReactElement {
  const [items, setItems] = useState<PublishedSurveyRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSurveyId ?? null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [issuedExpiresAt, setIssuedExpiresAt] = useState<Date | null>(null);
  const [issuedTitle, setIssuedTitle] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [publicLink, setPublicLink] = useState<{ enabled: boolean; token: string | null } | null>(
    null
  );
  const [publicCopied, setPublicCopied] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/surveys/published");
      const body = (await res.json()) as { items?: PublishedSurveyRow[] };
      setItems(body.items ?? []);
      if (initialSurveyId && body.items?.some((i) => i.id === initialSurveyId)) {
        setSelectedId(initialSurveyId);
      }
    } finally {
      setLoading(false);
    }
  }, [initialSurveyId]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setPublicLink(null);
      return;
    }
    const surveyId = selectedId;
    async function loadPublic(): Promise<void> {
      try {
        const res = await fetch(
          `/api/admin/surveys/${encodeURIComponent(surveyId)}/public-link`
        );
        const body = (await res.json()) as {
          enabled?: boolean;
          token?: string | null;
          published?: boolean;
        };
        if (!res.ok) {
          setPublicLink(null);
          return;
        }
        setPublicLink({
          enabled: body.enabled === true && body.published === true,
          token: body.token ?? null,
        });
      } catch {
        setPublicLink(null);
      }
    }
    void loadPublic();
  }, [selectedId]);

  async function issueInvite(): Promise<void> {
    if (!selectedId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/surveys/${encodeURIComponent(selectedId)}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await res.json()) as {
        code?: string;
        expiresAt?: string;
        surveyTitle?: string;
        error?: string;
      };
      if (!res.ok || !body.code || !body.expiresAt) {
        setError(body.error ?? "Не удалось выдать приглашение");
        return;
      }
      setIssuedCode(body.code);
      setIssuedExpiresAt(new Date(body.expiresAt));
      setIssuedTitle(body.surveyTitle ?? null);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  const selected = items.find((i) => i.id === selectedId) ?? null;

  async function copyInviteMessage(): Promise<void> {
    if (!issuedCode || !issuedExpiresAt) {
      return;
    }
    const message = buildInviteCopyMessage({
      serviceUrl: inviteEntryUrl(origin, issuedCode),
      code: issuedCode,
      validThrough: formatInviteValidThroughRu(issuedExpiresAt),
    });
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать");
    }
  }

  async function copyServiceLink(): Promise<void> {
    if (!issuedCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteEntryUrl(origin, issuedCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать ссылку");
    }
  }

  return (
    <div className="flex flex-col gap-4">
          <p className={`m-0 text-[15px] ${surveyMutedTextClass}`}>
            Выберите опубликованный опрос или тест. Смешивать с методиками в одном приглашении
            нельзя — только отдельный код на опрос.
          </p>

          {loading ? <p className={surveyMutedTextClass}>Загрузка…</p> : null}
          {!loading && items.length === 0 ? (
            <p className={surveyMutedTextClass}>
              Нет опубликованных опросов. Сначала опубликуйте опрос в разделе «Опросы».
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${surveyCardClass} text-left ${
                  selectedId === item.id ? "ring-2 ring-[#007A68]" : ""
                }`}
                onClick={() => {
                  setSelectedId(item.id);
                  setIssuedCode(null);
                }}
              >
                <div className="text-[12px] font-bold text-[#5F5E5E]">
                  {item.mode === "test" ? "Тест" : "Опрос"} · версия {String(item.versionNumber)}
                </div>
                <div className="text-[16px] font-extrabold text-[#1D1D1F]">{item.title}</div>
                <div className={`text-[13px] ${surveyMutedTextClass}`}>
                  {String(item.questionCount)} вопросов
                </div>
              </button>
            ))}
          </div>

          {error ? <p className="text-[14px] font-semibold text-red-700">{error}</p> : null}

          {publicLink?.enabled && publicLink.token && origin ? (
            <div className={`${surveyCardClass} space-y-2`}>
              <p className="text-[14px] font-extrabold text-[#1D1D1F]">Общая ссылка на опрос</p>
              <p className={`text-[13px] ${surveyMutedTextClass}`}>
                Одна ссылка для всех — без персональных кодов. Включено в настройках опроса.
              </p>
              <p className="break-all text-[13px] font-semibold">
                {surveyPublicLinkUrl(origin, publicLink.token)}
              </p>
              <button
                type="button"
                className={surveyOutlineButtonClass}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(surveyPublicLinkUrl(origin, publicLink.token!))
                    .then(() => {
                      setPublicCopied(true);
                      setTimeout(() => setPublicCopied(false), 2000);
                    });
                }}
              >
                {publicCopied ? "Скопировано" : "Скопировать общую ссылку"}
              </button>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!selected || busy}
            className={surveyPrimaryButtonClass}
            onClick={() => void issueInvite()}
          >
            {busy ? "Создание…" : "Создать персональное приглашение"}
          </button>

          {issuedCode && issuedExpiresAt ? (
            <CreateInviteSuccessCard
              testTitle={issuedTitle ?? "Собственный опрос"}
              personLabel="Респондент"
              code={issuedCode}
              validThroughLabel={formatInviteValidThroughRu(issuedExpiresAt)}
              devMode={false}
              copyBusyLabel={copied ? "Скопировано" : "Скопировать приглашение"}
              onCopyInvite={() => void copyInviteMessage()}
              onCopyLink={() => void copyServiceLink()}
              onCreateAnother={() => {
                setIssuedCode(null);
                setIssuedExpiresAt(null);
                setCopied(false);
              }}
            />
          ) : null}
    </div>
  );
}

/** Переключатель режима для встраивания в CreateTestPanel. */
export function CustomSurveyAssignModeSwitch(props: {
  mode: "builtin" | "custom";
  onChange: (mode: "builtin" | "custom") => void;
}): React.ReactElement {
  return (
    <div role="group" aria-label="Тип назначения" className={`${surveyTemplateTrackClass} mb-4`}>
      <button
        type="button"
        className={props.mode === "builtin" ? surveyTemplateActiveClass : surveyTemplateIdleClass}
        onClick={() => props.onChange("builtin")}
      >
        Встроенные методики
      </button>
      <button
        type="button"
        className={props.mode === "custom" ? surveyTemplateActiveClass : surveyTemplateIdleClass}
        onClick={() => props.onChange("custom")}
      >
        Собственные опросы
      </button>
    </div>
  );
}
