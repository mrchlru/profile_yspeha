"use client";

import React, { useEffect, useState } from "react";

import type { InviteEmployeeOption } from "@/lib/admin/getInviteEmployeeByFolderKey";
import { adminPanelCardClass, adminPanelMutedTextClass } from "@/lib/admin/adminPanelTheme";
import { CANDIDATE_POSITION_LEVEL_OPTIONS } from "@/lib/admin/candidatePositionLevels";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { stepInputClass, stepLabelClass } from "@/lib/stepPageTheme";

export type EmployeeInviteForm = {
  lastName: string;
  firstName: string;
  birthDate: string;
  positionLevel: string;
};

export type EmployeeInviteMode = "existing" | "new";

export type EmployeeInviteSelection = {
  mode: EmployeeInviteMode;
  existingFolderKey: string | null;
  selectedDisplayName: string | null;
  needsPositionLevel: boolean;
  candidate: EmployeeInviteForm;
};

export const EMPTY_EMPLOYEE_INVITE: EmployeeInviteSelection = {
  mode: "existing",
  existingFolderKey: null,
  selectedDisplayName: null,
  needsPositionLevel: false,
  candidate: {
    lastName: "",
    firstName: "",
    birthDate: "",
    positionLevel: "",
  },
};

export type EmployeeInviteSelectorProps = {
  value: EmployeeInviteSelection;
  onChange: (value: EmployeeInviteSelection) => void;
};

/**
 * Выбор сотрудника из архива скрининга или создание нового для приглашения.
 */
export function EmployeeInviteSelector({
  value,
  onChange,
}: EmployeeInviteSelectorProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [employees, setEmployees] = useState<ReadonlyArray<InviteEmployeeOption>>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (value.mode !== "existing") {
      return;
    }

    async function loadEmployees(): Promise<void> {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery.trim()) {
          params.set("q", debouncedQuery.trim());
        }
        const res = await fetch(`/api/admin/invite-employees?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as { items?: InviteEmployeeOption[]; error?: string };
        if (!res.ok || !body.items) {
          setLoadError(body.error ?? "Не удалось загрузить список сотрудников.");
          setEmployees([]);
          return;
        }
        setEmployees(body.items);
      } catch {
        setLoadError("Сеть недоступна. Попробуйте ещё раз.");
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    }

    void loadEmployees();
  }, [debouncedQuery, value.mode]);

  function setMode(mode: EmployeeInviteMode): void {
    onChange({
      ...EMPTY_EMPLOYEE_INVITE,
      mode,
      candidate: mode === "new" ? { ...EMPTY_EMPLOYEE_INVITE.candidate } : value.candidate,
    });
    setQuery("");
  }

  function selectEmployee(employee: InviteEmployeeOption): void {
    onChange({
      mode: "existing",
      existingFolderKey: employee.folderKey,
      selectedDisplayName: employee.displayName,
      needsPositionLevel: !employee.positionLevel,
      candidate: {
        lastName: employee.lastName,
        firstName: employee.firstName,
        birthDate: employee.birthDate,
        positionLevel: employee.positionLevel ?? "",
      },
    });
  }

  function updateCandidate<K extends keyof EmployeeInviteForm>(
    field: K,
    fieldValue: EmployeeInviteForm[K]
  ): void {
    onChange({
      ...value,
      candidate: { ...value.candidate, [field]: fieldValue },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`rounded-full px-4 py-2 text-[14px] font-bold ${
            value.mode === "existing"
              ? "bg-[#00B596] text-white"
              : "bg-white/70 text-[#5F5E5E]"
          }`}
        >
          Выбрать из архива
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`rounded-full px-4 py-2 text-[14px] font-bold ${
            value.mode === "new"
              ? "bg-[#00B596] text-white"
              : "bg-white/70 text-[#5F5E5E]"
          }`}
        >
          Создать сотрудника
        </button>
      </div>

      {value.mode === "existing" ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="employee-search" className={`block ${stepLabelClass}`}>
              Поиск сотрудника
            </label>
            <input
              id="employee-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Фамилия, имя, дата рождения, должность"
              className={`${stepInputClass} h-12 text-[16px]`}
            />
            <p className={`mt-2 ${adminPanelMutedTextClass}`}>
              Показаны сотрудники, которые уже проходили скрининг.
            </p>
          </div>

          {loadError ? (
            <p className="text-sm font-medium text-red-700/90" role="alert">
              {loadError}
            </p>
          ) : null}

          <div className={`max-h-[280px] space-y-2 overflow-y-auto px-4 py-4 ${adminPanelCardClass}`}>
            {loading ? (
              <p className={adminPanelMutedTextClass}>Загрузка…</p>
            ) : employees.length === 0 ? (
              <p className={adminPanelMutedTextClass}>
                Сотрудников по запросу не найдено. Создайте нового или измените поиск.
              </p>
            ) : (
              employees.map((employee) => {
                const selected = value.existingFolderKey === employee.folderKey;
                return (
                  <button
                    key={employee.folderKey}
                    type="button"
                    onClick={() => selectEmployee(employee)}
                    className={`block w-full rounded-2xl px-4 py-3 text-left transition ${
                      selected
                        ? "bg-[#00B596]/15 ring-2 ring-[#00B596]/50"
                        : "bg-white/60 hover:bg-white/90"
                    }`}
                  >
                    <p className="text-[15px] font-bold text-[#5F5E5E]">{employee.displayName}</p>
                    <p className={`mt-1 text-[13px] ${adminPanelMutedTextClass}`}>
                      {employee.positionLevelLabel
                        ? `Уровень: ${employee.positionLevelLabel}`
                        : "Уровень должности не указан"}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {value.selectedDisplayName ? (
            <p className="text-[14px] font-medium text-[#007A68]">
              Выбран: <span className="font-extrabold">{value.selectedDisplayName}</span>
            </p>
          ) : null}

          {value.needsPositionLevel ? (
            <div>
              <label htmlFor="existing-position-level" className={`block ${stepLabelClass}`}>
                Уровень должности
              </label>
              <select
                id="existing-position-level"
                value={value.candidate.positionLevel}
                onChange={(event) => updateCandidate("positionLevel", event.target.value)}
                className={`${stepInputClass} h-12 text-[16px]`}
              >
                <option value="">Выберите уровень</option>
                {CANDIDATE_POSITION_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="employee-last-name" className={`block ${stepLabelClass}`}>
              Фамилия
            </label>
            <input
              id="employee-last-name"
              type="text"
              value={value.candidate.lastName}
              onChange={(event) => updateCandidate("lastName", event.target.value)}
              className={`${stepInputClass} h-12 text-[16px]`}
              autoComplete="family-name"
            />
          </div>
          <div>
            <label htmlFor="employee-first-name" className={`block ${stepLabelClass}`}>
              Имя
            </label>
            <input
              id="employee-first-name"
              type="text"
              value={value.candidate.firstName}
              onChange={(event) => updateCandidate("firstName", event.target.value)}
              className={`${stepInputClass} h-12 text-[16px]`}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label htmlFor="employee-birth-date" className={`block ${stepLabelClass}`}>
              Дата рождения
            </label>
            <input
              id="employee-birth-date"
              type="date"
              value={value.candidate.birthDate}
              onChange={(event) => updateCandidate("birthDate", event.target.value)}
              className={`${stepInputClass} h-12 text-[16px]`}
            />
          </div>
          <div>
            <label htmlFor="employee-position-level" className={`block ${stepLabelClass}`}>
              Уровень должности
            </label>
            <select
              id="employee-position-level"
              value={value.candidate.positionLevel}
              onChange={(event) => updateCandidate("positionLevel", event.target.value)}
              className={`${stepInputClass} h-12 text-[16px]`}
            >
              <option value="">Выберите уровень</option>
              {CANDIDATE_POSITION_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Проверяет, заполнены ли данные для создания приглашения с выбором сотрудника.
 */
export function isEmployeeInviteSelectionReady(selection: EmployeeInviteSelection): boolean {
  if (selection.mode === "existing") {
    if (!selection.existingFolderKey) {
      return false;
    }
    if (selection.needsPositionLevel) {
      return selection.candidate.positionLevel.trim().length > 0;
    }
    return true;
  }

  return (
    selection.candidate.lastName.trim().length > 0 &&
    selection.candidate.firstName.trim().length > 0 &&
    selection.candidate.birthDate.length > 0 &&
    selection.candidate.positionLevel.length > 0
  );
}
