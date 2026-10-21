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
import { AdminListSwitchRow } from "@/components/admin/ui/AdminUi";
import { adminPrimaryButtonClass } from "@/lib/admin/adminPanelTheme";

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
export type RegenerateManagerBriefPanelProps = {
  embedded?: boolean;
};

export function RegenerateManagerBriefPanel({
  embedded = false,
}: RegenerateManagerBriefPanelProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<RegenerateManagerBriefResult | null>(null);

  async function runRegenerate(): Promise<void> {
    if (
      !window.confirm(
        "Пересобрать заключения для руководителя по отчётам ОД и ТУ? Операция может занять несколько минут."
      )
    ) {
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
              : `Ошибка сервера (${String(res.status)}). Проверьте логи сервера.`
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
    <div className={embedded ? "space-y-4" : `space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
      {!embedded ? (
        <div>
          <h2 className={adminPanelSectionTitleClass}>Заключение для руководителя (ОД / ТУ)</h2>
          <p className={`mt-2 ${adminPanelMutedTextClass}`}>
            Отчёты ОД и ТУ; обработка пачками.
          </p>
        </div>
      ) : (
        <p className={adminPanelMutedTextClass}>ОД и ТУ; обработка пачками.</p>
      )}

      <AdminListSwitchRow
        title="Заключение через OpenAI"
        subtitle="Без переключателя — только правила"
        checked={useAi}
        onChange={setUseAi}
        disabled={busy}
      />

      <Button
        type="button"
        disabled={busy}
        onClick={() => void runRegenerate()}
        className={adminPrimaryButtonClass}
      >
        {busy ? "Пересчёт…" : "Запустить"}
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
