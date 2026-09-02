"use client";

import React, { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import {
  EmployeeInviteSelector,
  EMPTY_EMPLOYEE_INVITE,
  isEmployeeInviteSelectionReady,
  type EmployeeInviteSelection,
} from "@/components/admin/EmployeeInviteSelector";
import {
  InterviewFolderSelector,
  EMPTY_INTERVIEW_FOLDER_SELECTION,
  isInterviewFolderSelectionReady,
  type InterviewFolderSelection,
} from "@/components/admin/InterviewFolderSelector";
import { ADMIN_TEST_CATALOG_ID_SCREENING, ADMIN_TEST_CATALOG } from "@/lib/admin/adminTestCatalog";
import {
  adminPanelBadgeReadyClass,
  adminPanelBadgeSoonClass,
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { CANDIDATE_POSITION_LEVEL_OPTIONS } from "@/lib/admin/candidatePositionLevels";
import type { CandidateLookupMatch } from "@/lib/admin/candidateFolderTypes";
import { buildInviteCopyMessage, screeningEntryUrl } from "@/lib/access/inviteMessage";
import { formatInviteValidThroughRu } from "@/lib/access/inviteValidity";
import { ADMIN_ROLE_ADMIN } from "@/lib/admin/adminRoles";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  stepInputClass,
  stepLabelClass,
  stepNavPrimaryButtonClass,
} from "@/lib/stepPageTheme";

type ScreeningCandidateForm = {
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  positionLevel: string;
};

const EMPTY_CANDIDATE: ScreeningCandidateForm = {
  lastName: "",
  firstName: "",
  middleName: "",
  birthDate: "",
  positionLevel: "",
};

/**
 * Раздел «А) Создать тестирование»: выпуск приглашений и карточки тестов.
 */
export function CreateTestPanel(): React.ReactElement {
  const { session } = useAdminSession();
  const isFullAdmin = session.status === "authenticated" && session.role === ADMIN_ROLE_ADMIN;
  const [origin, setOrigin] = useState("");
  const [selectedId, setSelectedId] = useState(ADMIN_TEST_CATALOG[0]?.id ?? "screening");
  const [candidate, setCandidate] = useState<ScreeningCandidateForm>(EMPTY_CANDIDATE);
  const [employeeInvite, setEmployeeInvite] =
    useState<EmployeeInviteSelection>(EMPTY_EMPLOYEE_INVITE);
  const [interviewFolder, setInterviewFolder] = useState<InterviewFolderSelection>(
    EMPTY_INTERVIEW_FOLDER_SELECTION
  );
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [issuedExpiresAt, setIssuedExpiresAt] = useState<Date | null>(null);
  const [issuedFolderName, setIssuedFolderName] = useState<string | null>(null);
  const [issuedInterviewFolderName, setIssuedInterviewFolderName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<CandidateLookupMatch | null>(null);
  const [devModeInvite, setDevModeInvite] = useState(false);
  const [issuedDevMode, setIssuedDevMode] = useState(false);
  const debouncedCandidate = useDebouncedValue(candidate, 400);

  const selected = ADMIN_TEST_CATALOG.find((item) => item.id === selectedId) ?? null;
  const isScreening = selectedId === ADMIN_TEST_CATALOG_ID_SCREENING;
  const supportsEmployeePick = Boolean(selected?.supportsEmployeePick);

  const screeningReady =
    candidate.lastName.trim().length > 0 &&
    candidate.firstName.trim().length > 0 &&
    candidate.birthDate.length > 0 &&
    candidate.positionLevel.length > 0 &&
    isInterviewFolderSelectionReady(interviewFolder);

  const employeePickReady = isEmployeeInviteSelectionReady(employeeInvite);

  const canCreate =
    Boolean(selected?.available && selected.inviteTestKind) &&
    (isScreening
      ? screeningReady
      : supportsEmployeePick
        ? employeePickReady
        : true);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setCandidate(EMPTY_CANDIDATE);
    setEmployeeInvite(EMPTY_EMPLOYEE_INVITE);
    setInterviewFolder(EMPTY_INTERVIEW_FOLDER_SELECTION);
    setDevModeInvite(false);
  }, [selectedId]);

  useEffect(() => {
    setIssuedCode(null);
    setIssuedExpiresAt(null);
    setIssuedFolderName(null);
    setIssuedInterviewFolderName(null);
    setIssuedDevMode(false);
    setCopied(false);
    setError(null);
  }, [candidate, employeeInvite, interviewFolder, selectedId, devModeInvite]);

  useEffect(() => {
    if (!isScreening) {
      setDuplicateMatch(null);
      return;
    }

    const lastName = debouncedCandidate.lastName.trim();
    const firstName = debouncedCandidate.firstName.trim();
    const birthDate = debouncedCandidate.birthDate;
    if (!lastName || !firstName || birthDate.length < 10) {
      setDuplicateMatch(null);
      return;
    }

    async function lookup(): Promise<void> {
      try {
        const params = new URLSearchParams({
          lastName,
          firstName,
          birthDate,
        });
        if (debouncedCandidate.middleName.trim()) {
          params.set("middleName", debouncedCandidate.middleName.trim());
        }
        const res = await fetch(`/api/admin/candidate-folders?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as { match?: CandidateLookupMatch | null };
        if (res.ok) {
          setDuplicateMatch(body.match ?? null);
        }
      } catch {
        setDuplicateMatch(null);
      }
    }

    void lookup();
  }, [debouncedCandidate, isScreening]);

  const serviceLink = useMemo(() => screeningEntryUrl(origin || "https://example.com"), [origin]);

  const message = useMemo(() => {
    if (!issuedCode || !origin || !issuedExpiresAt) {
      return "";
    }
    return buildInviteCopyMessage({
      serviceUrl: serviceLink,
      code: issuedCode,
      validThrough: formatInviteValidThroughRu(issuedExpiresAt),
    });
  }, [issuedCode, issuedExpiresAt, origin, serviceLink]);

  function updateCandidate<K extends keyof ScreeningCandidateForm>(
    field: K,
    value: ScreeningCandidateForm[K]
  ): void {
    setCandidate((prev) => ({ ...prev, [field]: value }));
  }

  function buildInviteRequestBody(): Record<string, unknown> | null {
    if (!selected?.inviteTestKind) {
      return null;
    }

    if (isScreening) {
      const body: Record<string, unknown> = {
        testKind: selected.inviteTestKind,
        candidate: {
          lastName: candidate.lastName.trim(),
          firstName: candidate.firstName.trim(),
          middleName: candidate.middleName.trim() || undefined,
          birthDate: candidate.birthDate,
          positionLevel: candidate.positionLevel,
        },
      };

      if (interviewFolder.mode === "existing" && interviewFolder.existingFolderKey) {
        body.existingInterviewFolderKey = interviewFolder.existingFolderKey;
      } else {
        (body.candidate as Record<string, unknown>).positionTitle =
          interviewFolder.positionTitle.trim();
      }

      if (devModeInvite) {
        body.devMode = true;
      }

      return body;
    }

    if (supportsEmployeePick) {
      if (employeeInvite.mode === "existing" && employeeInvite.existingFolderKey) {
        return {
          testKind: selected.inviteTestKind,
          existingFolderKey: employeeInvite.existingFolderKey,
          ...(employeeInvite.needsPositionLevel
            ? { positionLevelOverride: employeeInvite.candidate.positionLevel }
            : {}),
          ...(devModeInvite ? { devMode: true } : {}),
        };
      }

      return {
        testKind: selected.inviteTestKind,
        candidate: {
          lastName: employeeInvite.candidate.lastName.trim(),
          firstName: employeeInvite.candidate.firstName.trim(),
          birthDate: employeeInvite.candidate.birthDate,
          positionLevel: employeeInvite.candidate.positionLevel,
        },
        ...(devModeInvite ? { devMode: true } : {}),
      };
    }

    return {
      testKind: selected.inviteTestKind,
      ...(devModeInvite ? { devMode: true } : {}),
    };
  }

  async function createInvite(): Promise<void> {
    if (!canCreate) {
      return;
    }

    const body = buildInviteRequestBody();
    if (!body) {
      return;
    }

    setError(null);
    setCopied(false);
    setIssuedCode(null);
    setIssuedExpiresAt(null);
    setIssuedFolderName(null);
    setIssuedInterviewFolderName(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/access-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseBody = (await res.json()) as {
        code?: string;
        expiresAt?: string;
        folderDisplayName?: string;
        interviewFolderDisplayName?: string;
        error?: string;
      };
      if (!res.ok || !responseBody.code || !responseBody.expiresAt) {
        setError(responseBody.error ?? "Не удалось создать приглашение.");
        return;
      }
      setIssuedCode(responseBody.code);
      setIssuedExpiresAt(new Date(responseBody.expiresAt));
      setIssuedDevMode(devModeInvite);
      setIssuedFolderName(responseBody.folderDisplayName ?? null);
      setIssuedInterviewFolderName(responseBody.interviewFolderDisplayName ?? null);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  async function copyMessage(): Promise<void> {
    if (!message) {
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать в буфер обмена.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {ADMIN_TEST_CATALOG.map((item) => {
          const selectedCard = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`${adminPanelCardClass} px-5 py-5 text-left transition ${
                selectedCard ? "ring-2 ring-[#00B596]/60" : "hover:bg-[#E7E7E7]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className={adminPanelSectionTitleClass}>{item.title}</h2>
                <span className={item.available ? adminPanelBadgeReadyClass : adminPanelBadgeSoonClass}>
                  {item.available ? "Доступен" : "Скоро"}
                </span>
              </div>
              <p className={`mt-3 ${adminPanelMutedTextClass}`}>{item.description}</p>
            </button>
          );
        })}
      </div>

      {selected?.available ? (
        <div className={`space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
          <div>
            <h3 className={adminPanelSectionTitleClass}>Приглашение: {selected.title}</h3>
            <p className={`mt-2 ${adminPanelMutedTextClass}`}>
              {isScreening
                ? "Заполните данные соискателя и укажите должность (вакансию). Папка в разделе «Собеседование» создаётся из должности и даты первого скрининга. Код действует 3 суток."
                : supportsEmployeePick
                  ? "Выберите сотрудника из архива скрининга или создайте нового. Данные привяжутся к папке в системе. Код действует 3 суток."
                  : "Код действует 3 суток с момента создания."}
            </p>
          </div>

          {isScreening ? (
            <>
              <InterviewFolderSelector value={interviewFolder} onChange={setInterviewFolder} />
              {duplicateMatch ? (
                <div className="rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-4">
                  <p className="text-[14px] font-extrabold text-amber-950">
                    Кандидат уже есть в системе
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-amber-900">
                    {duplicateMatch.reasonLabel}
                  </p>
                  <p className="mt-2 text-[13px] text-amber-800">
                    Новое приглашение будет привязано к существующей папке «
                    {duplicateMatch.displayName}» без задвоения.
                  </p>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="candidate-last-name" className={`block ${stepLabelClass}`}>
                  Фамилия
                </label>
                <input
                  id="candidate-last-name"
                  type="text"
                  value={candidate.lastName}
                  onChange={(event) => updateCandidate("lastName", event.target.value)}
                  className={`${stepInputClass} h-12 text-[16px]`}
                  autoComplete="family-name"
                />
              </div>
              <div>
                <label htmlFor="candidate-first-name" className={`block ${stepLabelClass}`}>
                  Имя
                </label>
                <input
                  id="candidate-first-name"
                  type="text"
                  value={candidate.firstName}
                  onChange={(event) => updateCandidate("firstName", event.target.value)}
                  className={`${stepInputClass} h-12 text-[16px]`}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label htmlFor="candidate-middle-name" className={`block ${stepLabelClass}`}>
                  Отчество
                </label>
                <input
                  id="candidate-middle-name"
                  type="text"
                  value={candidate.middleName}
                  onChange={(event) => updateCandidate("middleName", event.target.value)}
                  className={`${stepInputClass} h-12 text-[16px]`}
                  autoComplete="additional-name"
                />
              </div>
              <div>
                <label htmlFor="candidate-birth-date" className={`block ${stepLabelClass}`}>
                  Дата рождения
                </label>
                <input
                  id="candidate-birth-date"
                  type="date"
                  value={candidate.birthDate}
                  onChange={(event) => updateCandidate("birthDate", event.target.value)}
                  className={`${stepInputClass} h-12 text-[16px]`}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="candidate-position-level" className={`block ${stepLabelClass}`}>
                  Уровень должности
                </label>
                <select
                  id="candidate-position-level"
                  value={candidate.positionLevel}
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
            </>
          ) : null}

          {supportsEmployeePick ? (
            <EmployeeInviteSelector value={employeeInvite} onChange={setEmployeeInvite} />
          ) : null}

          {isFullAdmin ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={devModeInvite}
                onChange={(event) => setDevModeInvite(event.target.checked)}
              />
              <span>
                <span className="block text-[14px] font-extrabold text-amber-950">
                  DEV-режим (техтест)
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-amber-900">
                  Свободная навигация по шагам, текстовый отчёт без PDF и ИИ. Код не помечается
                  использованным. Доступно только главному администратору.
                </span>
              </span>
            </label>
          ) : null}

          {error ? (
            <p className="text-sm font-medium text-red-700/90" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void createInvite()}
              disabled={busy || !canCreate}
              className={stepNavPrimaryButtonClass}
            >
              {busy ? "Создание…" : "Сформировать код и текст"}
            </Button>
            {issuedCode ? (
            <div className="flex min-h-[56px] flex-1 flex-wrap items-center justify-center gap-2 rounded-[51px] border border-black/10 bg-white/70 px-6 font-mono text-[18px] font-bold tracking-wider text-[#4F4F4F]">
              {issuedCode}
              {issuedDevMode ? (
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-950">
                  DEV
                </span>
              ) : null}
            </div>
          ) : null}
          </div>

          {issuedFolderName ? (
            <p className="text-[14px] text-[#007A68]">
              Папка в архиве: <span className="font-extrabold">{issuedFolderName}</span>
            </p>
          ) : null}

          {issuedInterviewFolderName ? (
            <p className="text-[14px] text-[#007A68]">
              Папка в «Собеседование»:{" "}
              <span className="font-extrabold">{issuedInterviewFolderName}</span>
            </p>
          ) : null}

          {message ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className={stepLabelClass}>Текст для копирования</span>
                <Button type="button" variant="secondary" onClick={() => void copyMessage()}>
                  {copied ? "Скопировано" : "Копировать"}
                </Button>
              </div>
              <textarea
                readOnly
                className={`${stepInputClass} min-h-[220px] font-sans leading-relaxed`}
                value={message}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className={`px-6 py-6 ${adminPanelCardClass}`}>
          <p className={adminPanelMutedTextClass}>
            Тип теста «{selected?.title ?? ""}» будет доступен после сборки методики.
          </p>
        </div>
      )}
    </div>
  );
}
