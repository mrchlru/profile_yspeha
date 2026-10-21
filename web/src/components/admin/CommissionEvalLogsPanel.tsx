"use client";

import React, { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { AdminSettingsGroup } from "@/components/admin/AdminSettingsGroup";
import { AdminSettingsRow } from "@/components/admin/AdminSettingsRow";
import { AdminSettingsSheet } from "@/components/admin/AdminSettingsSheet";
import type { CommissionEvalSaveFailureLogView } from "@/lib/commission/logCommissionEvalSaveFailure";
import { formatAdminDateTimeShort } from "@/lib/datetime/adminDateFormat";
import {
  adminPanelMutedTextClass,
  adminSecondaryButtonClass,
} from "@/lib/admin/adminPanelTheme";

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
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const statusLabel = loading ? "…" : items.length === 0 ? "Пусто" : `${String(items.length)} записей`;

  return (
    <>
      <AdminSettingsGroup title="Журнал" adminOnly>
        <AdminSettingsRow
          title="Ошибки сохранения анкет"
          subtitle="Участник, вопрос и причина"
          statusLabel={statusLabel}
          statusTone={items.length > 0 ? "warn" : "neutral"}
          onClick={() => setSheetOpen(true)}
        />
      </AdminSettingsGroup>

      {error ? (
        <p className="text-sm font-medium text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <AdminSettingsSheet
        open={sheetOpen}
        title="Ошибки сохранения анкет"
        onClose={() => setSheetOpen(false)}
      >
        <div className="space-y-4">
          <p className={adminPanelMutedTextClass}>
            Участникам комиссии эти детали не показываются.
          </p>
          <Button
            type="button"
            disabled={loading}
            onClick={() => void loadLogs()}
            className={adminSecondaryButtonClass}
          >
            Обновить
          </Button>

          {loading ? (
            <p className={adminPanelMutedTextClass}>Загрузка…</p>
          ) : items.length === 0 ? (
            <p className={adminPanelMutedTextClass}>Записей пока нет.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-[14px]">
                <thead>
                  <tr className="text-[12px] font-semibold uppercase tracking-wide text-[var(--admin-text-3)]">
                    <th className="px-3 py-2">Время</th>
                    <th className="px-3 py-2">Участник</th>
                    <th className="px-3 py-2">Вопрос</th>
                    <th className="px-3 py-2">Тип</th>
                    <th className="px-3 py-2">Ошибка</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="rounded-xl bg-[var(--admin-bg)]">
                      <td className="whitespace-nowrap px-3 py-3 align-top text-[var(--admin-text-2)]">
                        {formatAdminDateTimeShort(item.createdAt)}
                      </td>
                      <td className="px-3 py-3 align-top font-medium text-[var(--admin-text)]">
                        {item.memberLastName} {item.memberFirstName}
                      </td>
                      <td className="max-w-xs px-3 py-3 align-top break-words text-[var(--admin-text-2)]">
                        {item.questionText ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-top text-[var(--admin-text-2)]">
                        {FAILURE_KIND_LABELS[item.failureKind] ?? item.failureKind}
                      </td>
                      <td className="max-w-md px-3 py-3 align-top break-words text-[var(--admin-text-2)]">
                        {item.errorMessage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminSettingsSheet>
    </>
  );
}
