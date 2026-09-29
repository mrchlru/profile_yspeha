"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import type { AttestationReportView } from "@/lib/admin/buildAttestationReportView";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { ROSENZWEIG_SITUATIONS } from "@/lib/attestation/attestationQuestions";
import type {
  RosenzweigCodingMap,
  RosenzweigDirection,
  RosenzweigReaction,
} from "@/lib/attestation/rosenzweigCoding";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";

/**
 * Просмотр отчёта аттестации и кодирование Розенцвейга.
 */
export function AttestationReportViewer(): React.ReactElement {
  const params = useParams();
  const folderKey = decodeURIComponent(String(params.employeeKey ?? ""));
  const sessionId = decodeURIComponent(String(params.sessionId ?? ""));
  const [view, setView] = useState<AttestationReportView | null>(null);
  const [coding, setCoding] = useState<RosenzweigCodingMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadView = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ folderKey, sessionId });
      const res = await fetch(
        `/api/admin/attestation-report/view?${query.toString()}`,
        { cache: "no-store" }
      );
      const body = (await res.json()) as { view?: AttestationReportView; error?: string };
      if (!res.ok || !body.view) {
        setError(body.error ?? "Не удалось загрузить отчёт.");
        setView(null);
        return;
      }
      setView(body.view);
      setCoding(body.view.rosenzweigCoding);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [folderKey, sessionId]);

  useEffect(() => {
    void loadView();
  }, [loadView]);

  async function handleSaveCoding(): Promise<void> {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/attestation-rosenzweig-coding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderKey, sessionId, coding }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setSaveMessage(body.error ?? "Не удалось сохранить кодирование.");
        return;
      }
      setSaveMessage("Кодирование сохранено.");
      await loadView();
    } catch {
      setSaveMessage("Сеть недоступна.");
    } finally {
      setSaving(false);
    }
  }

  function updateCoding(
    situationId: string,
    patch: Partial<{ direction: RosenzweigDirection; reaction: RosenzweigReaction }>
  ): void {
    setCoding((prev) => {
      const current = prev[situationId] ?? { direction: "E" as RosenzweigDirection, reaction: "NP" as RosenzweigReaction };
      return {
        ...prev,
        [situationId]: {
          direction: patch.direction ?? current.direction,
          reaction: patch.reaction ?? current.reaction,
        },
      };
    });
  }

  if (loading) {
    return <p className={adminPanelMutedTextClass}>Загрузка отчёта…</p>;
  }

  if (error || !view) {
    return (
      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <p className="text-sm font-medium text-red-700/90">{error ?? "Отчёт не найден."}</p>
        <Link
          href={`/admin/results/${encodeURIComponent(folderKey)}`}
          className="inline-flex rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
        >
          ← К папке
        </Link>
      </div>
    );
  }

  const { scores } = view.report;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#8C8C8C]">
            Аттестация
          </p>
          <h2 className="text-[24px] font-extrabold text-[#5F5E5E]">{view.personName}</h2>
          <p className={`mt-2 ${adminPanelMutedTextClass}`}>
            Пройден: {formatMoscowDateTime(view.createdAt)}
            {view.computedAt ? ` · Рассчитано: ${view.computedAt}` : null}
          </p>
        </div>
        <Link
          href={`/admin/results/${encodeURIComponent(folderKey)}`}
          className="rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
        >
          ← К папке
        </Link>
      </div>

      <ScoreSection title="Mini-IPIP (Big Five)">
        <ul className="list-inside list-disc text-[14px] text-[#5F5E5E]">
          {Object.entries(scores.miniIpip).map(([key, value]) => (
            <li key={key}>
              {key}: {String(value)}
            </li>
          ))}
        </ul>
      </ScoreSection>

      <ScoreSection title="Управленческий потенциал">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="text-[#8C8C8C]">
              <th className="py-2">Шкала</th>
              <th className="py-2">Сумма</th>
              <th className="py-2">Диапазон</th>
            </tr>
          </thead>
          <tbody>
            {scores.managementPotential.map((row) => (
              <tr key={row.scale} className="border-t border-black/5">
                <td className="py-2">{row.scale}</td>
                <td className="py-2">{String(row.sum)}</td>
                <td className="py-2">{row.band}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScoreSection>

      <ScoreSection title="CBI">
        {scores.cbi.map((row) => (
          <p key={row.scale} className="text-[14px] text-[#5F5E5E]">
            {row.scale}: {row.mean.toFixed(1)} ({row.band})
          </p>
        ))}
      </ScoreSection>

      <ScoreSection title="Шпилбергер">
        {scores.spielberger.map((row) => (
          <p key={row.scale} className="text-[14px] text-[#5F5E5E]">
            {row.scale === "state" ? "ST (ситуативная)" : "LT (личностная)"}: {String(row.total)} (
            {row.band})
          </p>
        ))}
      </ScoreSection>

      <ScoreSection title="ДДО Климова">
        <ul className="list-inside list-disc text-[14px] text-[#5F5E5E]">
          {Object.entries(scores.klimovDdo).map(([key, value]) => (
            <li key={key}>
              {key}: {String(value)}
            </li>
          ))}
        </ul>
      </ScoreSection>

      <ScoreSection title="Люшер">
        {scores.luscher ? (
          <p className="text-[14px] text-[#5F5E5E]">
            SO: {scores.luscher.so.toFixed(1)} · VK: {scores.luscher.vk.toFixed(2)}
          </p>
        ) : (
          <p className={adminPanelMutedTextClass}>Нет данных по рангам цветов.</p>
        )}
      </ScoreSection>

      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <h3 className={adminPanelSectionTitleClass}>Розенцвейг — кодирование ответов</h3>
        <div className="space-y-4">
          {ROSENZWEIG_SITUATIONS.map((situation) => {
            const textAnswer = view.answers[situation.id];
            const entry = coding[situation.id];
            return (
              <div
                key={situation.id}
                className="rounded-2xl border border-black/8 bg-white/70 px-4 py-4"
              >
                <p className="text-[14px] font-bold text-[#5F5E5E]">{situation.text}</p>
                <p className="mt-2 text-[13px] text-[#8C8C8C]">
                  {typeof textAnswer === "string" && textAnswer.trim()
                    ? textAnswer
                    : "— ответ не заполнен —"}
                </p>
                <div className="mt-3 flex flex-wrap gap-4">
                  <label className="text-[13px] text-[#5F5E5E]">
                    Направление{" "}
                    <select
                      className="ml-1 rounded-lg border border-black/10 px-2 py-1"
                      value={entry?.direction ?? ""}
                      onChange={(event) =>
                        updateCoding(situation.id, {
                          direction: event.target.value as RosenzweigDirection,
                        })
                      }
                    >
                      <option value="">—</option>
                      <option value="E">E</option>
                      <option value="I">I</option>
                      <option value="M">M</option>
                    </select>
                  </label>
                  <label className="text-[13px] text-[#5F5E5E]">
                    Реакция{" "}
                    <select
                      className="ml-1 rounded-lg border border-black/10 px-2 py-1"
                      value={entry?.reaction ?? ""}
                      onChange={(event) =>
                        updateCoding(situation.id, {
                          reaction: event.target.value as RosenzweigReaction,
                        })
                      }
                    >
                      <option value="">—</option>
                      <option value="OD">OD</option>
                      <option value="ED">ED</option>
                      <option value="NP">NP</option>
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={saving} onClick={() => void handleSaveCoding()}>
            {saving ? "Сохранение…" : "Сохранить кодирование"}
          </Button>
          {saveMessage ? (
            <p className="text-[13px] font-medium text-[#5F5E5E]" role="status">
              {saveMessage}
            </p>
          ) : null}
        </div>
        {view.report.rosenzweigCodingSummary ? (
          <div className="mt-4 text-[13px] text-[#5F5E5E]">
            <p>
              Закодировано: {String(view.report.rosenzweigCodingSummary.codedCount)} /{" "}
              {String(view.report.rosenzweigCodingSummary.totalSituations)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ScoreSectionProps = {
  title: string;
  children: React.ReactNode;
};

function ScoreSection({ title, children }: ScoreSectionProps): React.ReactElement {
  return (
    <div className={`px-6 py-5 ${adminPanelCardClass}`}>
      <h3 className={`mb-3 ${adminPanelSectionTitleClass}`}>{title}</h3>
      {children}
    </div>
  );
}
