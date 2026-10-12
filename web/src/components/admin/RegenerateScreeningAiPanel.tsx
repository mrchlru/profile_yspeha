"use client";

import React, { useState } from "react";

import { Button } from "@/components/Button";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import type {
  RegenerateScreeningAiBatchResult,
  RegenerateScreeningAiResult,
} from "@/lib/admin/regenerateStoredScreeningAiConclusions";
import { stepNavPrimaryButtonClass } from "@/lib/stepPageTheme";

function _emptyAggregate(): RegenerateScreeningAiResult {
  return {
    totalAuditRows: 0,
    eligible: 0,
    updated: 0,
    skippedProfile: 0,
    skippedHasConclusion: 0,
    skippedInvalid: 0,
    failed: 0,
    errors: [],
    processedSessionIds: [],
  };
}

/**
 * Перегенерация ИИ-заключения по скринингу кандидата (только главный админ).
 */
export function RegenerateScreeningAiPanel(): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [forceAll, setForceAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<RegenerateScreeningAiResult | null>(null);

  async function runRegenerate(): Promise<void> {
    if (!confirmed) {
      setError("Отметьте подтверждение перед запуском.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(null);
    setResult(null);

    const batchSize = 2;
    let afterSessionId: string | null = null;
    const aggregate = _emptyAggregate();
    let batchIndex = 0;

    try {
      for (;;) {
        batchIndex += 1;
        setProgress(
          `Обработка пачки ${String(batchIndex)}… уже обновлено ${String(aggregate.updated)} отчётов.`
        );

        const res = await fetch("/api/admin/reports/regenerate-screening-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirm: true,
            forceAll,
            batchSize,
            afterSessionId,
          }),
        });

        const rawText = await res.text();
        let body: RegenerateScreeningAiBatchResult | { error?: string };
        try {
          body = JSON.parse(rawText) as RegenerateScreeningAiBatchResult | { error?: string };
        } catch {
          setError(
            res.ok
              ? "Сервер вернул не JSON (возможен обрыв соединения). Часть отчётов могла уже обновиться."
              : `Ошибка сервера (${String(res.status)}). Проверьте логи Railway.`
          );
          if (aggregate.updated > 0) {
            setResult(aggregate);
          }
          return;
        }

        if (!res.ok) {
          setError("error" in body && body.error ? body.error : "Не удалось перегенерировать заключения.");
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
        aggregate.skippedHasConclusion += body.skippedHasConclusion;
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
          ? ` Частично обновлено: ${String(aggregate.updated)}. Можно запустить снова.`
          : "";
      setError(
        `Запрос прерван (часто таймаут при долгом ИИ).${hint} Детали: ${
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
        <h2 className={adminPanelSectionTitleClass}>ИИ-заключение по скринингу</h2>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Генерирует развёрнутое заключение OpenAI для прохождений батареи «Скрининг»
          (ПРОФ СБ + методики). Нужно, если при отправке закончились деньги на API и блок
          остался пустым.
        </p>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          По умолчанию обрабатываются только отчёты без заключения. Пачками по 2, чтобы не
          обрывалось соединение.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={forceAll}
          onChange={(event) => setForceAll(event.target.checked)}
          disabled={busy}
        />
        <span className={`text-[14px] leading-relaxed ${adminPanelMutedTextClass}`}>
          Перегенерировать и те, где заключение уже есть (дольше и дороже).
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
          Я понимаю, что в JSON отчётов скрининга будет записано новое ИИ-заключение.
        </span>
      </label>

      <Button
        type="button"
        disabled={busy}
        onClick={() => void runRegenerate()}
        className={stepNavPrimaryButtonClass}
      >
        {busy ? "Генерация…" : "Сгенерировать заключения скрининга"}
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
            <li>Записей аудита в базе: {String(result.totalAuditRows)}</li>
            <li>Подходит скрининг (в этих пачках): {String(result.eligible)}</li>
            <li>Обновлено: {String(result.updated)}</li>
            <li>Пропущено (уже есть заключение): {String(result.skippedHasConclusion)}</li>
            <li>Пропущено (другой профиль): {String(result.skippedProfile)}</li>
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
