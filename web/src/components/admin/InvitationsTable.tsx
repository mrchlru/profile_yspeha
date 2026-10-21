"use client";

import React, { useEffect, useState } from "react";

import {
  AdminBulkActionButton,
  AdminBulkSelectionBar,
} from "@/components/admin/AdminBulkSelectionBar";
import { AdminSelectCheckbox } from "@/components/admin/AdminSelectCheckbox";
import { CandidateSearchPanel } from "@/components/admin/CandidateSearchPanel";
import { AdminRowMenuItem, AdminRowMoreMenu } from "@/components/admin/AdminRowMoreMenu";
import { formatAdminDateTimeTitle } from "@/lib/datetime/adminDateFormat";
import {
  INVITE_STATUS_ACTIVE,
  INVITE_STATUS_EXPIRED,
  INVITE_STATUS_IN_PROGRESS,
  INVITE_STATUS_REVOKED,
  INVITE_STATUS_USED,
} from "@/lib/admin/inviteStatus";
import { listChangeableInviteTestKinds } from "@/lib/admin/adminTestCatalog";
import { ACCESS_INVITE_VALIDITY_DAYS } from "@/lib/access/inviteValidity";
import { TEST_KIND_LABELS, type TestKind } from "@/lib/access/testKinds";
import { runBulkAdminActions } from "@/lib/admin/runBulkAdminActions";
import { formatMoscowDateTimeTable } from "@/lib/datetime/moscowTime";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
} from "@/lib/admin/adminPanelTheme";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useAdminSession } from "@/hooks/useAdminSession";
import type { CandidateSearchStatusFilter } from "@/components/admin/CandidateSearchPanel";
import { AdminStatusChip, type AdminStatusChipTone } from "@/components/admin/ui/AdminUi";

type InvitationRow = {
  id: string;
  code: string;
  testKind: string;
  testKindLabel: string;
  canChangeTestKind: boolean;
  avProctorDisabled: boolean;
  canChangeAvProctor: boolean;
  proctorWithCamera: boolean;
  candidateDisplayName: string | null;
  positionLevelLabel: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  status: string;
  statusLabel: string;
};

const INVITE_TEST_KIND_OPTIONS: ReadonlyArray<{ value: TestKind; label: string }> =
  listChangeableInviteTestKinds().map((value) => ({
    value,
    label: TEST_KIND_LABELS[value],
  }));

function inviteStatusTone(status: string): AdminStatusChipTone {
  switch (status) {
    case INVITE_STATUS_ACTIVE:
      return "info";
    case INVITE_STATUS_IN_PROGRESS:
      return "warn";
    case INVITE_STATUS_USED:
      return "ok";
    case INVITE_STATUS_EXPIRED:
      return "neutral";
    case INVITE_STATUS_REVOKED:
      return "danger";
    default:
      return "neutral";
  }
}

export type InvitationsTableProps = {
  refreshToken?: number;
  onLoadingChange?: (loading: boolean) => void;
};

/**
 * Таблица статусов приглашений на тестирование.
 */
export function InvitationsTable({
  refreshToken = 0,
  onLoadingChange,
}: InvitationsTableProps = {}): React.ReactElement {
  const { session } = useAdminSession();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CandidateSearchStatusFilter>("all");
  const debouncedQuery = useDebouncedValue(query);
  const [rows, setRows] = useState<ReadonlyArray<InvitationRow>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [changingKindId, setChangingKindId] = useState<string | null>(null);
  const [changingAvId, setChangingAvId] = useState<string | null>(null);
  const [extendMessage, setExtendMessage] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const canDeleteInvites = session.status === "authenticated";
  const selection = useBulkSelection(rows, (row) => row.id);
  const rowActionBusy =
    bulkBusy ||
    extendingId !== null ||
    deletingId !== null ||
    changingKindId !== null ||
    changingAvId !== null;

  async function loadRows(search: string, status: CandidateSearchStatusFilter): Promise<void> {
    setLoading(true);
    onLoadingChange?.(true);
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
      onLoadingChange?.(false);
    }
  }

  useEffect(() => {
    void loadRows(debouncedQuery, statusFilter);
  }, [debouncedQuery, statusFilter, refreshToken]);

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

  async function postChangeTestKind(inviteId: string, testKind: string): Promise<{
    testKind: string;
    testKindLabel: string;
  }> {
    const res = await fetch("/api/admin/invitations/change-test-kind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId, testKind }),
    });
    const body = (await res.json()) as {
      testKind?: string;
      testKindLabel?: string;
      error?: string;
    };
    if (!res.ok || !body.testKind || !body.testKindLabel) {
      throw new Error(body.error ?? "Не удалось изменить тип теста.");
    }
    return { testKind: body.testKind, testKindLabel: body.testKindLabel };
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

  async function postChangeAvProctor(
    inviteId: string,
    avProctorDisabled: boolean
  ): Promise<{ avProctorDisabled: boolean }> {
    const res = await fetch("/api/admin/invitations/change-av-proctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId, avProctorDisabled }),
    });
    const body = (await res.json()) as { avProctorDisabled?: boolean; error?: string };
    if (!res.ok || body.avProctorDisabled === undefined) {
      throw new Error(body.error ?? "Не удалось изменить режим прокторинга.");
    }
    return { avProctorDisabled: body.avProctorDisabled };
  }

  async function toggleAvProctor(row: InvitationRow, nextValue: boolean): Promise<void> {
    if (!row.canChangeAvProctor || row.avProctorDisabled === nextValue) {
      return;
    }

    setChangingAvId(row.id);
    setError(null);
    setExtendMessage(null);
    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, avProctorDisabled: nextValue } : item
      )
    );

    try {
      const result = await postChangeAvProctor(row.id, nextValue);
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, avProctorDisabled: result.avProctorDisabled } : item
        )
      );
      setExtendMessage(
        nextValue
          ? `Для ${row.code} отключены камера и микрофон.`
          : `Для ${row.code} включены камера и микрофон.`
      );
    } catch (err) {
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, avProctorDisabled: row.avProctorDisabled } : item
        )
      );
      setError(err instanceof Error ? err.message : "Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setChangingAvId(null);
    }
  }

  async function changeTestKind(row: InvitationRow, nextTestKind: string): Promise<void> {
    if (!row.canChangeTestKind || nextTestKind === row.testKind) {
      return;
    }

    const previous = { testKind: row.testKind, testKindLabel: row.testKindLabel };
    const nextLabel =
      INVITE_TEST_KIND_OPTIONS.find((option) => option.value === nextTestKind)?.label ??
      nextTestKind;

    setChangingKindId(row.id);
    setError(null);
    setExtendMessage(null);
    setRows((current) =>
      current.map((item) =>
        item.id === row.id
          ? { ...item, testKind: nextTestKind, testKindLabel: nextLabel }
          : item
      )
    );

    try {
      const result = await postChangeTestKind(row.id, nextTestKind);
      setRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? {
                ...item,
                testKind: result.testKind,
                testKindLabel: result.testKindLabel,
              }
            : item
        )
      );
      setExtendMessage(`Тип теста для ${row.code} обновлён.`);
    } catch (err) {
      setRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? { ...item, testKind: previous.testKind, testKindLabel: previous.testKindLabel }
            : item
        )
      );
      setError(err instanceof Error ? err.message : "Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setChangingKindId(null);
    }
  }

  const totalCount = rows.length;

  return (
    <div className="space-y-4">
      <CandidateSearchPanel
        query={query}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        compactFilterLabels
      />

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
        busy={rowActionBusy || loading}
      >
        <AdminBulkActionButton
          label={`Продлить (+${String(ACCESS_INVITE_VALIDITY_DAYS)} сут.)`}
          disabled={bulkBusy}
          onClick={() => void bulkExtendInvites()}
        />
        {canDeleteInvites ? (
          <AdminBulkActionButton
            label="Удалить"
            variant="danger"
            disabled={bulkBusy}
            onClick={() => void bulkDeleteInvites()}
          />
        ) : null}
      </AdminBulkSelectionBar>

      <div className={`overflow-hidden ${adminPanelCardClass}`}>
        <div className="hidden border-b border-[var(--admin-hairline)] px-4 py-3 text-[13px] font-medium text-[var(--admin-text-3)] sm:flex sm:gap-3">
          <span className="w-8 shrink-0" aria-hidden />
          <span className="min-w-0 flex-[2]">Соискатель</span>
          <span className="min-w-0 flex-[1.4]">Код</span>
          <span className="min-w-0 flex-[1.3]">Тест</span>
          <span className="w-8 shrink-0 text-center">Кам.</span>
          <span className="min-w-0 flex-1">Истекает</span>
          <span className="min-w-0 flex-[1.1]">Статус</span>
          <span className="w-8 shrink-0" aria-hidden />
        </div>
        <ul className="divide-y divide-[var(--admin-hairline)]">
          {rows.length === 0 ? (
            <li className="px-4 py-8 text-center text-[var(--admin-text-3)]">
              {loading ? "Загрузка…" : "Приглашений по заданным условиям не найдено."}
            </li>
          ) : (
            rows.map((row) => (
              <li key={row.id}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap">
                  <div className="w-8 shrink-0">
                    <AdminSelectCheckbox
                      checked={selection.isSelected(row.id)}
                      disabled={rowActionBusy}
                      onChange={() => selection.toggle(row.id)}
                      label={`Выбрать ${row.code}`}
                      hideLabel
                    />
                  </div>
                  <div className="min-w-0 flex-[2]">
                    <p className="text-[15px] font-semibold text-[var(--admin-text)]">
                      {row.candidateDisplayName ?? "—"}
                    </p>
                    {row.positionLevelLabel ? (
                      <p className="text-[13px] text-[var(--admin-text-3)]">
                        {row.positionLevelLabel}
                      </p>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-[1.4] font-mono text-[14px] font-medium text-[var(--admin-text)]">
                    {row.code}
                  </div>
                  <div className="min-w-0 flex-[1.3] text-[14px] text-[var(--admin-text-2)]">
                    {row.testKindLabel}
                  </div>
                  <div className="flex w-8 shrink-0 justify-center">
                    <InviteCameraControl
                      row={row}
                      busy={changingAvId === row.id}
                      onToggle={() => void toggleAvProctor(row, !row.avProctorDisabled)}
                    />
                  </div>
                  <div
                    className="min-w-0 flex-1 text-[14px] text-[var(--admin-text-3)]"
                    title={formatAdminDateTimeTitle(row.expiresAt)}
                  >
                    {formatMoscowDateTimeTable(row.expiresAt)}
                  </div>
                  <div className="min-w-0 flex-[1.1]">
                    <AdminStatusChip label={row.statusLabel} tone={inviteStatusTone(row.status)} />
                  </div>
                  <AdminRowMoreMenu ariaLabel={`Действия для ${row.code}`}>
                    {canExtendInvite(row.status) ? (
                      <AdminRowMenuItem
                        label={
                          extendingId === row.id
                            ? "Продление…"
                            : `Продлить (+${String(ACCESS_INVITE_VALIDITY_DAYS)} сут.)`
                        }
                        disabled={rowActionBusy}
                        onClick={() => void extendInvite(row)}
                      />
                    ) : null}
                    {row.canChangeAvProctor ? (
                      <AdminRowMenuItem
                        label={
                          row.avProctorDisabled
                            ? "Включить камеру и микрофон"
                            : "Отключить камеру и микрофон"
                        }
                        disabled={rowActionBusy || changingAvId === row.id}
                        onClick={() => void toggleAvProctor(row, !row.avProctorDisabled)}
                      />
                    ) : null}
                    {row.canChangeTestKind
                      ? INVITE_TEST_KIND_OPTIONS.filter((option) => option.value !== row.testKind).map(
                          (option) => (
                            <AdminRowMenuItem
                              key={option.value}
                              label={`Тип: ${option.label}`}
                              disabled={rowActionBusy || changingKindId === row.id}
                              onClick={() => void changeTestKind(row, option.value)}
                            />
                          )
                        )
                      : null}
                    {canDeleteInvites ? (
                      <AdminRowMenuItem
                        label={deletingId === row.id ? "Удаление…" : "Удалить"}
                        tone="danger"
                        disabled={rowActionBusy}
                        onClick={() => void deleteInvite(row)}
                      />
                    ) : null}
                  </AdminRowMoreMenu>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <p className={adminPanelMutedTextClass}>
        {loading
          ? "Загрузка…"
          : `Показано ${String(totalCount)} из ${String(totalCount)} · время московское`}
      </p>
    </div>
  );
}

function InviteCameraControl({
  row,
  busy,
  onToggle,
}: {
  row: InvitationRow;
  busy: boolean;
  onToggle: () => void;
}): React.ReactElement {
  if (!row.proctorWithCamera) {
    return (
      <span className="text-[14px] text-[var(--admin-text-3)]" aria-hidden>
        —
      </span>
    );
  }

  const cameraOn = !row.avProctorDisabled;
  const canToggle = row.canChangeAvProctor;
  const label = cameraOn
    ? `Камера и микрофон включены для ${row.code}. Нажмите, чтобы отключить.`
    : `Камера и микрофон выключены для ${row.code}.${canToggle ? " Нажмите, чтобы включить." : ""}`;

  if (!canToggle) {
    return (
      <span
        className={cameraOn ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-3)]"}
        aria-label={label}
        title={label}
      >
        {cameraOn ? <CameraOnIcon /> : <CameraOffIcon />}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onToggle}
      className={`inline-flex size-9 items-center justify-center rounded-full transition hover:bg-[var(--admin-surface-muted)] disabled:opacity-50 ${
        cameraOn ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-3)]"
      }`}
      aria-label={label}
      title={label}
    >
      {cameraOn ? <CameraOnIcon /> : <CameraOffIcon />}
    </button>
  );
}

function CameraOnIcon(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2.1l1.2-1.6A1.5 1.5 0 0 1 11 3.8h2a1.5 1.5 0 0 1 1.2.6L15.4 6h2.1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}

function CameraOffIcon(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2.1l1.2-1.6A1.5 1.5 0 0 1 11 3.8h2a1.5 1.5 0 0 1 1.2.6L15.4 6h2.1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.2" />
      <path d="M5 19.5 19 4.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
