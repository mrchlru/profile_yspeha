"use client";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import {
  AdminBulkActionButton,
  AdminBulkSelectionBar,
} from "@/components/admin/AdminBulkSelectionBar";
import { AdminSelectCheckbox } from "@/components/admin/AdminSelectCheckbox";
import { CandidateSearchPanel } from "@/components/admin/CandidateSearchPanel";
import {
  INVITE_STATUS_ACTIVE,
  INVITE_STATUS_EXPIRED,
  INVITE_STATUS_REVOKED,
  INVITE_STATUS_USED,
} from "@/lib/admin/inviteStatus";
import { ACCESS_INVITE_VALIDITY_DAYS } from "@/lib/access/inviteValidity";
import { runBulkAdminActions } from "@/lib/admin/runBulkAdminActions";
import { ADMIN_ROLE_ADMIN } from "@/lib/admin/adminRoles";
import { formatMoscowDateTimeTable } from "@/lib/datetime/moscowTime";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
} from "@/lib/admin/adminPanelTheme";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useAdminSession } from "@/hooks/useAdminSession";
import { stepNavPrimaryButtonClass } from "@/lib/stepPageTheme";
import type { CandidateSearchStatusFilter } from "@/components/admin/CandidateSearchPanel";

type InvitationRow = {
  id: string;
  code: string;
  testKindLabel: string;
  candidateDisplayName: string | null;
  positionLevelLabel: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  status: string;
  statusLabel: string;
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case INVITE_STATUS_ACTIVE:
      return "bg-emerald-100 text-emerald-800";
    case INVITE_STATUS_USED:
      return "bg-sky-100 text-sky-800";
    case INVITE_STATUS_EXPIRED:
      return "bg-amber-100 text-amber-900";
    case INVITE_STATUS_REVOKED:
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Таблица статусов приглашений на тестирование.
 */
export function InvitationsTable(): React.ReactElement {
  const { session } = useAdminSession();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CandidateSearchStatusFilter>("all");
  const debouncedQuery = useDebouncedValue(query);
  const [rows, setRows] = useState<ReadonlyArray<InvitationRow>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [extendMessage, setExtendMessage] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const isFullAdmin = session.status === "authenticated" && session.role === ADMIN_ROLE_ADMIN;
  const selection = useBulkSelection(rows, (row) => row.id);

  async function loadRows(search: string, status: CandidateSearchStatusFilter): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("q", search.trim());
      }
      if (status !== "all") {
        params.set("status", status);
      }
      const res = await fetch(`/api/admin/invitations?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as { items?: InvitationRow[]; error?: string };
      if (!res.ok || !body.items) {
        setError(body.error ?? "Не удалось загрузить приглашения.");
        setRows([]);
        return;
      }
      setRows(body.items);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRows(debouncedQuery, statusFilter);
  }, [debouncedQuery, statusFilter]);

  function canExtendInvite(status: string): boolean {
    return status === INVITE_STATUS_ACTIVE || status === INVITE_STATUS_EXPIRED;
  }

  async function postExtendInvite(inviteId: string): Promise<void> {
    const res = await fetch("/api/admin/invitations/extend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    const body = (await res.json()) as { expiresAt?: string; error?: string };
    if (!res.ok || !body.expiresAt) {
      throw new Error(body.error ?? "Не удалось продлить код.");
    }
  }

  async function postDeleteInvite(inviteId: string): Promise<void> {
    const res = await fetch("/api/admin/invitations/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    const body = (await res.json()) as { code?: string; error?: string };
    if (!res.ok || !body.code) {
      throw new Error(body.error ?? "Не удалось удалить приглашение.");
    }
  }

  async function bulkExtendInvites(): Promise<void> {
    const eligible = selection.getSelectedItems().filter((row) => canExtendInvite(row.status));
    if (eligible.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Продлить ${String(eligible.length)} кодов ещё на ${String(ACCESS_INVITE_VALIDITY_DAYS)} суток?`
      )
    ) {
      return;
    }

    setBulkBusy(true);
    setError(null);
    setExtendMessage(null);
    try {
      const result = await runBulkAdminActions(eligible.map((row) => row.id), postExtendInvite);
      if (result.failed > 0) {
        setError(
          result.lastError ??
            `Не удалось продлить ${String(result.failed)} из ${String(eligible.length)} кодов.`
        );
      } else {
        setExtendMessage(`Продлено кодов: ${String(result.succeeded)}.`);
      }
      selection.clear();
      await loadRows(debouncedQuery, statusFilter);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDeleteInvites(): Promise<void> {
    const eligible = selection.getSelectedItems();
    if (eligible.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Удалить ${String(eligible.length)} приглашений? Записи исчезнут из списка.`
      )
    ) {
      return;
    }

    setBulkBusy(true);
    setError(null);
    setExtendMessage(null);
    try {
      const result = await runBulkAdminActions(eligible.map((row) => row.id), postDeleteInvite);
      if (result.failed > 0) {
        setError(
          result.lastError ??
            `Не удалось удалить ${String(result.failed)} из ${String(eligible.length)} приглашений.`
        );
      } else {
        setExtendMessage(`Удалено приглашений: ${String(result.succeeded)}.`);
      }
      selection.clear();
      await loadRows(debouncedQuery, statusFilter);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function extendInvite(row: InvitationRow): Promise<void> {
    const confirmText =
      row.status === INVITE_STATUS_EXPIRED
        ? `Продлить истёкший код ${row.code} на ${String(ACCESS_INVITE_VALIDITY_DAYS)} суток?`
        : `Продлить код ${row.code} ещё на ${String(ACCESS_INVITE_VALIDITY_DAYS)} суток?`;
    if (!window.confirm(confirmText)) {
      return;
    }

    setExtendingId(row.id);
    setError(null);
    setExtendMessage(null);
    try {
      await postExtendInvite(row.id);
      setExtendMessage(`Код ${row.code} продлён.`);
      await loadRows(debouncedQuery, statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setExtendingId(null);
    }
  }

  async function deleteInvite(row: InvitationRow): Promise<void> {
    const label = row.candidateDisplayName ?? row.code;
    if (
      !window.confirm(
        `Удалить приглашение «${label}» (код ${row.code})? Запись исчезнет из списка. Результаты тестирования в папках не удаляются автоматически.`
      )
    ) {
      return;
    }

    setDeletingId(row.id);
    setError(null);
    setExtendMessage(null);
    try {
      await postDeleteInvite(row.id);
      setExtendMessage(`Приглашение ${row.code} удалено.`);
      await loadRows(debouncedQuery, statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <CandidateSearchPanel
        query={query}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={adminPanelMutedTextClass}>
          {loading
            ? "Загрузка…"
            : `Найдено приглашений: ${String(rows.length)}`}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void loadRows(debouncedQuery, statusFilter)}
          disabled={loading}
          className={stepNavPrimaryButtonClass}
        >
          {loading ? "Обновление…" : "Обновить"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {extendMessage ? (
        <p className="text-sm font-medium text-emerald-800" role="status">
          {extendMessage}
        </p>
      ) : null}

      <AdminBulkSelectionBar
        selectedCount={selection.selectedCount}
        totalCount={rows.length}
        allSelected={selection.allSelected}
        onToggleAll={selection.toggleAll}
        onClear={selection.clear}
        busy={bulkBusy || loading || extendingId !== null || deletingId !== null}
      >
        <AdminBulkActionButton
          label={`Продлить (+${String(ACCESS_INVITE_VALIDITY_DAYS)} сут.)`}
          disabled={bulkBusy}
          onClick={() => void bulkExtendInvites()}
        />
        {isFullAdmin ? (
          <AdminBulkActionButton
            label="Удалить"
            variant="danger"
            disabled={bulkBusy}
            onClick={() => void bulkDeleteInvites()}
          />
        ) : null}
      </AdminBulkSelectionBar>

      <div className={`overflow-x-auto ${adminPanelCardClass}`}>
        <table className="min-w-[1180px] w-full border-collapse text-left text-[14px] text-[#4F4F4F]">
          <thead className="bg-black/[0.03] text-[12px] font-extrabold uppercase tracking-wide text-[#5F5E5E]">
            <tr>
              <th className="w-10 px-3 py-3" aria-label="Выбор" />
              <th className="px-4 py-3">Соискатель</th>
              <th className="px-4 py-3">Код</th>
              <th className="px-4 py-3">Тип теста</th>
              <th className="px-4 py-3">Уровень должности</th>
              <th className="px-4 py-3">Создан</th>
              <th className="px-4 py-3">Действует до</th>
              <th className="px-4 py-3">Пройден</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[#8C8C8C]">
                  {loading ? "Загрузка…" : "Приглашений по заданным условиям не найдено."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-black/10">
                  <td className="px-3 py-2">
                    <AdminSelectCheckbox
                      checked={selection.isSelected(row.id)}
                      disabled={bulkBusy || extendingId !== null || deletingId !== null}
                      onChange={() => selection.toggle(row.id)}
                      label={`Выбрать ${row.code}`}
                      hideLabel
                    />
                  </td>
                  <td className="px-4 py-2">{row.candidateDisplayName ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-[13px] font-bold">{row.code}</td>
                  <td className="px-4 py-2">{row.testKindLabel}</td>
                  <td className="px-4 py-2">{row.positionLevelLabel ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-[12px]">
                    {formatMoscowDateTimeTable(row.createdAt)}
                  </td>
                  <td className="px-4 py-2 font-mono text-[12px]">
                    {formatMoscowDateTimeTable(row.expiresAt)}
                  </td>
                  <td className="px-4 py-2 font-mono text-[12px]">
                    {row.usedAt ? formatMoscowDateTimeTable(row.usedAt) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${statusBadgeClass(row.status)}`}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      {canExtendInvite(row.status) ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={extendingId !== null || deletingId !== null}
                          onClick={() => void extendInvite(row)}
                        >
                          {extendingId === row.id
                            ? "Продление…"
                            : `+${String(ACCESS_INVITE_VALIDITY_DAYS)} сут.`}
                        </Button>
                      ) : null}
                      {isFullAdmin ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={extendingId !== null || deletingId !== null}
                          onClick={() => void deleteInvite(row)}
                        >
                          {deletingId === row.id ? "Удаление…" : "Удалить"}
                        </Button>
                      ) : null}
                      {!canExtendInvite(row.status) && !isFullAdmin ? (
                        <span className="text-[12px] text-[#8C8C8C]">—</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
