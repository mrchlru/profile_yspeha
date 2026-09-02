"use client";

import React, { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import type { CommissionEvalSaveFailureLogView } from "@/lib/commission/logCommissionEvalSaveFailure";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { stepNavPrimaryButtonClass } from "@/lib/stepPageTheme";

const FAILURE_KIND_LABELS: Record<CommissionEvalSaveFailureLogView["failureKind"], string> = {
  ai_filter: "ИИ-фильтр",
  ai_classify: "ИИ-классификация",
  validation: "Валидация",
  reserved_question: "Занятый вопрос",
  unknown: "Другое",
};

/**
 * Лог неудачных сохранений анкет комиссии (только для администратора).
 */
export function CommissionEvalLogsPanel(): React.ReactElement {
  const [items, setItems] = useState<CommissionEvalSaveFailureLogView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/logs", { cache: "no-store" });
      const body = (await res.json()) as { items?: CommissionEvalSaveFailureLogView[]; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось загрузить логи.");
        setItems([]);
        return;
      }
      setItems(body.items ?? []);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className={`${adminPanelCardClass} space-y-4 px-5 py-5 sm:px-6 sm:py-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={adminPanelSectionTitleClass}>Логи анкет комиссии</h2>
          <p className={`mt-1 ${adminPanelMutedTextClass}`}>
            Неудачные сохранения: участник, вопрос и причина ошибки. Участникам комиссии детали не
            показываются.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className={stepNavPrimaryButtonClass}
          disabled={loading}
          onClick={() => void loadLogs()}
        >
          Обновить
        </Button>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className={adminPanelMutedTextClass}>Загрузка…</p>
      ) : items.length === 0 ? (
        <p className={adminPanelMutedTextClass}>Записей пока нет.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-left text-[14px]">
            <thead>
              <tr className="text-[12px] font-bold uppercase tracking-wide text-[#8C8C8C]">
                <th className="px-3 py-2">Время</th>
                <th className="px-3 py-2">Участник</th>
                <th className="px-3 py-2">Вопрос</th>
                <th className="px-3 py-2">Тип</th>
                <th className="px-3 py-2">Ошибка</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="rounded-2xl bg-white/70">
                  <td className="whitespace-nowrap px-3 py-3 align-top text-[#5F5E5E]">
                    {formatMoscowDateTime(item.createdAt)}
                  </td>
                  <td className="px-3 py-3 align-top font-semibold text-[#5F5E5E]">
                    {item.memberLastName} {item.memberFirstName}
                  </td>
                  <td className="max-w-xs px-3 py-3 align-top break-words text-[#5F5E5E]">
                    {item.questionText ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 align-top text-[#5F5E5E]">
                    {FAILURE_KIND_LABELS[item.failureKind] ?? item.failureKind}
                  </td>
                  <td className="max-w-md px-3 py-3 align-top break-words text-[#5F5E5E]">
                    {item.errorMessage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
