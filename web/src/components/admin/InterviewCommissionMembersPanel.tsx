"use client";

import React, { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import {
  MAX_INTERVIEW_COMMISSION_MEMBERS,
  type InterviewCommissionMemberRecord,
} from "@/lib/admin/interviewCommissionTypes";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { stepInputClass, stepLabelClass } from "@/lib/stepPageTheme";

export type InterviewCommissionMembersPanelProps = {
  interviewFolderKey: string;
  onMembersChanged?: () => void;
};

/**
 * Управление участниками комиссии собеседования (до 4 человек).
 */
export function InterviewCommissionMembersPanel({
  interviewFolderKey,
  onMembersChanged,
}: InterviewCommissionMembersPanelProps): React.ReactElement {
  const [members, setMembers] = useState<ReadonlyArray<InterviewCommissionMemberRecord>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const loadMembers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/interview-commission-members?folderKey=${encodeURIComponent(interviewFolderKey)}`,
        { cache: "no-store" }
      );
      const body = (await res.json()) as {
        items?: InterviewCommissionMemberRecord[];
        error?: string;
      };
      if (!res.ok || !body.items) {
        setError(body.error ?? "Не удалось загрузить комиссию.");
        setMembers([]);
        return;
      }
      setMembers(body.items);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [interviewFolderKey]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  async function addMember(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/interview-commission-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewFolderKey,
          firstName,
          lastName,
          email,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось добавить участника.");
        return;
      }
      setFirstName("");
      setLastName("");
      setEmail("");
      await loadMembers();
      onMembersChanged?.();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(memberId: string): Promise<void> {
    if (!window.confirm("Удалить участника из комиссии?")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ folderKey: interviewFolderKey });
      const res = await fetch(
        `/api/admin/interview-commission-members/${encodeURIComponent(memberId)}?${params.toString()}`,
        { method: "DELETE" }
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось удалить участника.");
        return;
      }
      await loadMembers();
      onMembersChanged?.();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const canAdd = members.length < MAX_INTERVIEW_COMMISSION_MEMBERS;

  return (
    <div className={`space-y-4 px-5 py-5 ${adminPanelCardClass}`}>
      <div>
        <h3 className={adminPanelSectionTitleClass}>Комиссия собеседования</h3>
        <p className={`mt-2 ${adminPanelMutedTextClass}`}>
          До {String(MAX_INTERVIEW_COMMISSION_MEMBERS)} участников на вакансию. После добавления им
          будет отправлена ссылка на оценочный лист (на следующем этапе).
        </p>
      </div>

      {loading ? <p className={adminPanelMutedTextClass}>Загрузка…</p> : null}

      {members.length > 0 ? (
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/60 px-4 py-3"
            >
              <div>
                <p className="text-[15px] font-bold text-[#4F4F4F]">{member.displayName}</p>
                <p className="text-[13px] text-[#8C8C8C]">{member.email}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void removeMember(member.id)}
              >
                Удалить
              </Button>
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className={adminPanelMutedTextClass}>Участники комиссии ещё не назначены.</p>
      ) : null}

      {canAdd ? (
        <div className="space-y-3 border-t border-black/10 pt-4">
          <p className="text-[14px] font-bold text-[#5F5E5E]">Добавить участника</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="commission-last-name" className={`block ${stepLabelClass}`}>
                Фамилия
              </label>
              <input
                id="commission-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className={`${stepInputClass} h-11 w-full text-[15px]`}
              />
            </div>
            <div>
              <label htmlFor="commission-first-name" className={`block ${stepLabelClass}`}>
                Имя
              </label>
              <input
                id="commission-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className={`${stepInputClass} h-11 w-full text-[15px]`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="commission-email" className={`block ${stepLabelClass}`}>
              Почта
            </label>
            <input
              id="commission-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`${stepInputClass} h-11 w-full text-[15px]`}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !firstName.trim() || !lastName.trim() || !email.trim()}
            onClick={() => void addMember()}
          >
            {busy ? "Добавление…" : "Добавить в комиссию"}
          </Button>
        </div>
      ) : (
        <p className={adminPanelMutedTextClass}>
          Достигнут лимит — в комиссии {String(MAX_INTERVIEW_COMMISSION_MEMBERS)} участника.
        </p>
      )}

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
