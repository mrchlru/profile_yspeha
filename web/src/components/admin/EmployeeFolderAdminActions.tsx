"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { Button } from "@/components/Button";
import type {
  EmployeeFolderDataItem,
  EmployeeFolderDataKind,
} from "@/lib/admin/employeeFolderTypes";
import { ADMIN_EMPLOYEE_ASSESSMENT_LABEL } from "@/lib/access/testKinds";
import type { DeleteEmployeeFolderTarget } from "@/lib/admin/deleteEmployeeFolder";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";

export type EmployeeFolderAdminActionsProps = {
  folderKey: string;
  displayName: string;
  dataItems: ReadonlyArray<EmployeeFolderDataItem>;
  onDataChanged: () => Promise<void>;
  /** После полного удаления папки — переход к списку. */
  redirectOnFolderRemoved?: boolean;
};

/**
 * Панель удаления данных папки (только для главного администратора).
 */
export function EmployeeFolderAdminActions({
  folderKey,
  displayName,
  dataItems,
  onDataChanged,
  redirectOnFolderRemoved = true,
}: EmployeeFolderAdminActionsProps): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDelete(
    target: DeleteEmployeeFolderTarget,
    confirmMessage: string
  ): Promise<void> {
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const busyKey = `${target.type}:${"id" in target ? target.id : ""}`;
    setBusy(busyKey);
    setError(null);
    try {
      const res = await fetch("/api/admin/results", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderKey, target }),
      });
      const body = (await res.json()) as {
        deleted?: number;
        folderRemoved?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Не удалось удалить данные.");
        return;
      }
      if (body.folderRemoved && redirectOnFolderRemoved && target.type === "folder") {
        router.push("/admin/results");
        return;
      }
      await onDataChanged();
      if (body.folderRemoved && dataItems.length <= 1 && redirectOnFolderRemoved) {
        router.push("/admin/results");
      }
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(null);
    }
  }

  const screeningCount = dataItems.filter((item) => item.kind === "screening").length;
  const inviteCount = dataItems.filter((item) => item.kind === "invite").length;
  const auditCount = dataItems.filter((item) => item.kind === "audit").length;

  return (
    <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass} border border-red-200/80`}>
      <div>
        <h3 className={adminPanelSectionTitleClass}>Удаление данных</h3>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          Доступно только главному администратору. Удалённые данные восстановить нельзя.
        </p>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {screeningCount > 0 ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null}
            onClick={() =>
              void runDelete(
                { type: "screening" },
                `Удалить все результаты скрининга (${String(screeningCount)}) в папке «${displayName}»?`
              )
            }
          >
            Удалить скрининг ({String(screeningCount)})
          </Button>
        ) : null}
        {inviteCount > 0 ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null}
            onClick={() =>
              void runDelete(
                { type: "invites" },
                `Удалить все приглашения (${String(inviteCount)}) в папке «${displayName}»?`
              )
            }
          >
            Удалить приглашения ({String(inviteCount)})
          </Button>
        ) : null}
        {auditCount > 0 ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null}
            onClick={() =>
              void runDelete(
                { type: "audit" },
                `Удалить все прохождения «${ADMIN_EMPLOYEE_ASSESSMENT_LABEL}» (${String(auditCount)}) в папке «${displayName}»?`
              )
            }
          >
            Удалить {ADMIN_EMPLOYEE_ASSESSMENT_LABEL} ({String(auditCount)})
          </Button>
        ) : null}
        {dataItems.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null}
            onClick={() =>
              void runDelete(
                { type: "folder" },
                `Удалить всю папку «${displayName}» со всеми данными (${String(dataItems.length)} записей)?`
              )
            }
          >
            Удалить всю папку
          </Button>
        ) : null}
      </div>

      {dataItems.length > 0 ? (
        <ul className="space-y-2">
          {dataItems.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/60 px-4 py-3"
            >
              <div>
                <p className="text-[14px] font-bold text-[#5F5E5E]">{item.label}</p>
                <p className={`text-[13px] ${adminPanelMutedTextClass}`}>
                  {_kindLabel(item.kind)} ·{" "}
                  {formatMoscowDateTime(item.createdAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={busy !== null}
                onClick={() =>
                  void runDelete(
                    _itemTarget(item),
                    `Удалить запись «${item.label}»?`
                  )
                }
              >
                Удалить
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={adminPanelMutedTextClass}>В папке нет данных для удаления.</p>
      )}
    </div>
  );
}

function _kindLabel(kind: EmployeeFolderDataKind): string {
  switch (kind) {
    case "screening":
      return "Скрининг";
    case "audit":
      return ADMIN_EMPLOYEE_ASSESSMENT_LABEL;
    case "invite":
      return "Приглашение";
    case "burnout":
      return "Выгорание";
    case "profSbEducation":
      return "ПРОФ СБ + образование";
  }
}

function _itemTarget(item: EmployeeFolderDataItem): DeleteEmployeeFolderTarget {
  switch (item.kind) {
    case "screening":
      return { type: "screeningSubmission", id: item.id };
    case "audit":
      return { type: "auditSubmission", id: item.id };
    case "invite":
      return { type: "invite", id: item.id };
    case "burnout":
      return { type: "burnoutSubmission", id: item.id };
    case "profSbEducation":
      return { type: "profSbEducationSubmission", id: item.id };
  }
}
