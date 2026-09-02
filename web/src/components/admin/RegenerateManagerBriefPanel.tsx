"use client";

import React, { useState } from "react";

import { Button } from "@/components/Button";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import type {
  RegenerateManagerBriefBatchResult,
  RegenerateManagerBriefResult,
} from "@/lib/admin/regenerateStoredManagerBriefConclusions";
import { stepNavPrimaryButtonClass } from "@/lib/stepPageTheme";

function _emptyAggregate(): RegenerateManagerBriefResult {
  return {
    totalAuditRows: 0,
    eligible: 0,
    updated: 0,
    skippedProfile: 0,
    skippedInvalid: 0,
    failed: 0,
    errors: [],
    processedSessionIds: [],
  };
}

/**
 * Пересчёт блока «Заключение» в отчёте для руководителя (ОД / ТУ), только главный админ.
 */
export function RegenerateManagerBriefPanel(): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<RegenerateManagerBriefResult | null>(null);

  async function runRegenerate(): Promise<void> {
    if (!confirmed) {
      setError("Отметьте подтверждение перед запуском.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(null);
    setResult(null);

    const batchSize = useAi ? 3 : 20;
    let afterSessionId: string | null = null;
    const aggregate = _emptyAggregate();
    let batchIndex = 0;

    try {
      for (;;) {
        batchIndex += 1;
        setProgress(
          `Обработка пачки ${String(batchIndex)}… уже обновлено ${String(aggregate.updated)} отчётов.`
        );

        const res = await fetch("/api/admin/reports/regenerate-manager-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirm: true,
            useAi,
            batchSize,
            afterSessionId,
          }),
        });

        const rawText = await res.text();
        let body: RegenerateManagerBriefBatchResult | { error?: string };
        try {
          body = JSON.parse(rawText) as RegenerateManagerBriefBatchResult | { error?: string };
        } catch {
          setError(
            res.ok
              ? "Сервер вернул не JSON (возможен обрыв соединения). Проверьте логи: часть отчётов могла уже обновиться."
              : `Ошибка сервера (${String(res.status)}). Проверьте логи Railway.`
          );
          if (aggregate.updated > 0) {
            setResult(aggregate);
          }
          return;
        }

        if (!res.ok) {
          setError("error" in body && body.error ? body.error : "Не удалось пересобрать заключения.");
          if (aggregate.updated > 0) {
            setResult(aggregate);
          }
          return;
        }
        if (!("updated" in body) || !("hasMore" in body)) {
          setError("Некорректный ответ сервера.");
          return;
        }

        if (aggregate.totalAuditRows === 0 && body.totalAuditRows > 0) {
          aggregate.totalAuditRows = body.totalAuditRows;
          aggregate.skippedProfile = body.skippedProfile;
          aggregate.skippedInvalid = body.skippedInvalid;
        }
        aggregate.eligible += body.eligible;
        aggregate.updated += body.updated;
        aggregate.failed += body.failed;
        aggregate.errors = [...aggregate.errors, ...body.errors].slice(0, 50);

        if (!body.hasMore) {
          break;
        }
        if (!body.nextAfterSessionId) {
          break;
        }
        afterSessionId = body.nextAfterSessionId;
      }

      setResult(aggregate);
    } catch (err) {
      const hint =
        aggregate.updated > 0
          ? ` Частично обновлено: ${String(aggregate.updated)}. Можно запустить снова — продолжим с места остановки.`
          : "";
      setError(
        `Запрос прерван (часто это таймаут прокси при долгом ИИ).${hint} Детали: ${
          err instanceof Error ? err.message : "unknown"
        }`
      );
      if (aggregate.updated > 0) {
        setResult(aggregate);
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className={`space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
      <div>
        <h2 className={adminPanelSectionTitleClass}>Заключение для руководителя (ОД / ТУ)</h2>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Финальный абзац «Заключение» генерирует OpenAI (промпт v3, критичный тон для
          руководителя) по пунктам отчёта этого человека. Модель:{" "}
          <span className="font-mono text-[13px]">OPENAI_MANAGER_BRIEF_MODEL</span> или общая{" "}
          <span className="font-mono text-[13px]">OPENAI_MODEL</span> (сейчас по умолчанию gpt-5.5).
          При сбое ИИ подставляется запасной короткий текст.
        </p>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          С OpenAI пересборка идёт пачками по 3 отчёта, чтобы не обрывалось
          соединение (на сервере при этом в логах будет много строк success — это нормально).
        </p>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Пересобирает полный объёмный отчёт (метрики, narrative, testBlocks) и отчёт для
          руководителя по актуальным правилам. Развёрнутое{" "}
          <span className="font-mono text-[13px]">ЗАКЛЮЧЕНИЕ (ИИ)</span> для HrD в полном PDF
          сохраняется без повторного вызова OpenAI. Финальное «Заключение» для руководителя
          генерируется через OpenAI (или по правилам, если галочка снята).
        </p>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Обновляются все сохранённые прохождения батарей «ОД, кадровый резерв» и «ТУ / шефы».
          PDF в админке пересоберётся при следующем открытии отчёта; устаревшие PDF-копии в
          папках удаляются.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={useAi}
          onChange={(event) => setUseAi(event.target.checked)}
          disabled={busy}
        />
        <span className={`text-[14px] leading-relaxed ${adminPanelMutedTextClass}`}>
          Генерировать финальное «Заключение» через OpenAI (дольше, нужен ключ API; без галочки —
          только правила).
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={busy}
        />
        <span className={`text-[14px] leading-relaxed ${adminPanelMutedTextClass}`}>
          Я понимаю, что в JSON отчётов будет пересобран полный объёмный отчёт и блок
          managerBrief (заключение для руководителя).
        </span>
      </label>

      <Button
        type="button"
        disabled={busy}
        onClick={() => void runRegenerate()}
        className={stepNavPrimaryButtonClass}
      >
        {busy ? "Пересчёт…" : "Пересобрать заключения для руководителя"}
      </Button>

      {progress ? (
        <p className={`text-sm ${adminPanelMutedTextClass}`} role="status">
          {progress}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-[14px] text-emerald-950"
          role="status"
        >
          <p className="font-extrabold">Готово</p>
          <ul className="mt-3 space-y-1">
            <li>
              Записей аудита в базе: {String(result.totalAuditRows)}; подходит ОД/ТУ (в этих
              пачках): {String(result.eligible)}
            </li>
            <li>Обновлено: {String(result.updated)}</li>
            <li>
              Пропущено (другой профиль / полный аудит): {String(result.skippedProfile)}
            </li>
            <li>Без валидного JSON: {String(result.skippedInvalid)}</li>
            <li>Ошибок: {String(result.failed)}</li>
          </ul>
          {result.errors.length > 0 ? (
            <ul className="mt-3 max-h-32 overflow-y-auto text-[12px]">
              {result.errors.map((item) => (
                <li key={item.sessionId}>
                  {item.sessionId}: {item.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
