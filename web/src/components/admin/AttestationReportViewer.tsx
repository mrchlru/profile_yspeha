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
import {
  CBI_SCALE_LABELS,
  KLIMOV_TYPE_LABELS,
  MANAGEMENT_POTENTIAL_SCALE_LABELS,
  MINI_IPIP_FACTOR_LABELS,
  MINI_IPIP_FACTOR_ORDER,
  SPIELBERGER_SCALE_LABELS,
  scoreBandBadgeClass,
  scoreBandLabel,
} from "@/lib/attestation/attestationLabels";
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
      const current = prev[situationId] ?? {
        direction: "E" as RosenzweigDirection,
        reaction: "NP" as RosenzweigReaction,
      };
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
    return (
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
        <p className={adminPanelMutedTextClass}>Загрузка отчёта…</p>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
        <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
          <p className="text-sm font-medium text-red-700/90">
            {error ?? "Отчёт не найден."}
          </p>
          <Link
            href={`/admin/results/${encodeURIComponent(folderKey)}`}
            className="inline-flex rounded-full bg-white/80 px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
          >
            ← К папке
          </Link>
        </div>
      </div>
    );
  }

  const { scores } = view.report;
  const codingSummary = view.report.rosenzweigCodingSummary;

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className={`px-6 py-5 sm:px-8 ${adminPanelCardClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8C8C8C]">
              Аттестация
            </p>
            <h2 className="mt-1 text-[26px] font-extrabold leading-tight text-[#5F5E5E] sm:text-[30px]">
              {view.personName}
            </h2>
            <p className={`mt-2 ${adminPanelMutedTextClass}`}>
              Пройден: {formatMoscowDateTime(view.createdAt)}
              {view.computedAt ? ` · Рассчитано: ${view.computedAt}` : null}
            </p>
          </div>
          <Link
            href={`/admin/results/${encodeURIComponent(folderKey)}`}
            className="shrink-0 rounded-full bg-white/80 px-4 py-2 text-[14px] font-bold text-[#5F5E5E] transition hover:bg-white"
          >
            ← К папке
          </Link>
        </div>
      </header>

      <ScoreSection
        title="Личностный профиль (Big Five)"
        hint="Mini-IPIP · баллы по факторам (диапазон 4–20)"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MINI_IPIP_FACTOR_ORDER.map((factor) => (
            <MetricTile
              key={factor}
              label={MINI_IPIP_FACTOR_LABELS[factor]}
              value={String(scores.miniIpip[factor])}
            />
          ))}
        </div>
      </ScoreSection>

      <ScoreSection
        title="Управленческий потенциал"
        hint="Сумма по шкале 5–25 · низкий 5–11 · средний 12–18 · высокий 19–25"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/10 text-[#8C8C8C]">
                <th className="pb-3 pr-3 font-bold">Шкала</th>
                <th className="pb-3 pr-3 font-bold">Сумма</th>
                <th className="pb-3 font-bold">Диапазон</th>
              </tr>
            </thead>
            <tbody>
              {scores.managementPotential.map((row) => (
                <tr key={row.scale} className="border-t border-black/5">
                  <td className="py-3 pr-3 font-semibold text-[#5F5E5E]">
                    {MANAGEMENT_POTENTIAL_SCALE_LABELS[row.scale]}
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-[#5F5E5E]">
                    {String(row.sum)}
                  </td>
                  <td className="py-3">
                    <BandBadge band={row.band} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScoreSection>

      <ScoreSection
        title="Выгорание (CBI)"
        hint="Средний балл шкалы · низкий <50 · средний 50–74 · высокий ≥75"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {scores.cbi.map((row) => (
            <MetricTile
              key={row.scale}
              label={CBI_SCALE_LABELS[row.scale]}
              value={row.mean.toFixed(1)}
              band={row.band}
            />
          ))}
        </div>
      </ScoreSection>

      <ScoreSection
        title="Тревожность (Шпилбергер–Ханин)"
        hint="Низкая <30 · средняя 31–44 · высокая ≥45"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {scores.spielberger.map((row) => (
            <MetricTile
              key={row.scale}
              label={SPIELBERGER_SCALE_LABELS[row.scale]}
              value={String(row.total)}
              band={row.band}
            />
          ))}
        </div>
      </ScoreSection>

      <ScoreSection title="Профессиональная направленность (ДДО Климова)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(KLIMOV_TYPE_LABELS) as Array<keyof typeof KLIMOV_TYPE_LABELS>).map(
            (type) => (
              <MetricTile
                key={type}
                label={KLIMOV_TYPE_LABELS[type]}
                value={String(scores.klimovDdo[type] ?? 0)}
              />
            )
          )}
        </div>
      </ScoreSection>

      <ScoreSection title="Цветовой тест (Люшер)">
        {scores.luscher ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile
              label="Суммарное отклонение (СО)"
              value={scores.luscher.so.toFixed(1)}
            />
            <MetricTile
              label="Вегетативный коэффициент (ВК)"
              value={scores.luscher.vk.toFixed(2)}
            />
          </div>
        ) : (
          <p className={adminPanelMutedTextClass}>Нет данных по рангам цветов.</p>
        )}
      </ScoreSection>

      <div className={`space-y-5 px-6 py-6 sm:px-8 ${adminPanelCardClass}`}>
        <div>
          <h3 className={adminPanelSectionTitleClass}>Розенцвейг — кодирование ответов</h3>
          <p className={`mt-1 ${adminPanelMutedTextClass}`}>
            Направление: E — внешне, I — на себя, M — безлично. Реакция: OD — с фиксацией на
            препятствии, ED — на самозащите, NP — на решении.
          </p>
          {codingSummary ? (
            <p className="mt-2 text-[13px] font-semibold text-[#5F5E5E]">
              Закодировано: {String(codingSummary.codedCount)} /{" "}
              {String(codingSummary.totalSituations)}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          {ROSENZWEIG_SITUATIONS.map((situation, index) => {
            const textAnswer = view.answers[situation.id];
            const entry = coding[situation.id];
            return (
              <div
                key={situation.id}
                className="rounded-2xl border border-black/8 bg-white/75 px-4 py-4 sm:px-5"
              >
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#8C8C8C]">
                  Ситуация {String(index + 1)}
                </p>
                <p className="mt-1 text-[14px] font-bold leading-snug text-[#5F5E5E]">
                  {situation.text}
                </p>
                <p className="mt-2 rounded-xl bg-[#F5F5F5] px-3 py-2 text-[13px] leading-relaxed text-[#5F5E5E]">
                  {typeof textAnswer === "string" && textAnswer.trim()
                    ? textAnswer
                    : "— ответ не заполнен —"}
                </p>
                <div className="mt-3 flex flex-wrap gap-4">
                  <label className="text-[13px] font-semibold text-[#5F5E5E]">
                    Направление
                    <select
                      className="ml-2 rounded-xl border border-black/10 bg-white px-3 py-1.5 font-medium"
                      value={entry?.direction ?? ""}
                      onChange={(event) =>
                        updateCoding(situation.id, {
                          direction: event.target.value as RosenzweigDirection,
                        })
                      }
                    >
                      <option value="">—</option>
                      <option value="E">E — внешне</option>
                      <option value="I">I — на себя</option>
                      <option value="M">M — безлично</option>
                    </select>
                  </label>
                  <label className="text-[13px] font-semibold text-[#5F5E5E]">
                    Реакция
                    <select
                      className="ml-2 rounded-xl border border-black/10 bg-white px-3 py-1.5 font-medium"
                      value={entry?.reaction ?? ""}
                      onChange={(event) =>
                        updateCoding(situation.id, {
                          reaction: event.target.value as RosenzweigReaction,
                        })
                      }
                    >
                      <option value="">—</option>
                      <option value="OD">OD — препятствие</option>
                      <option value="ED">ED — самозащита</option>
                      <option value="NP">NP — решение</option>
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
          <Button type="button" disabled={saving} onClick={() => void handleSaveCoding()}>
            {saving ? "Сохранение…" : "Сохранить кодирование"}
          </Button>
          {saveMessage ? (
            <p className="text-[13px] font-medium text-[#5F5E5E]" role="status">
              {saveMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type ScoreSectionProps = {
  title: string;
  hint?: string;
  children: React.ReactNode;
};

function ScoreSection({ title, hint, children }: ScoreSectionProps): React.ReactElement {
  return (
    <section className={`px-6 py-5 sm:px-8 ${adminPanelCardClass}`}>
      <h3 className={adminPanelSectionTitleClass}>{title}</h3>
      {hint ? <p className={`mt-1 mb-4 ${adminPanelMutedTextClass}`}>{hint}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

type MetricTileProps = {
  label: string;
  value: string;
  band?: "low" | "mid" | "high";
};

function MetricTile({ label, value, band }: MetricTileProps): React.ReactElement {
  return (
    <div className="rounded-2xl border border-black/8 bg-white/75 px-4 py-3">
      <p className="text-[13px] font-semibold leading-snug text-[#8C8C8C]">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-[22px] font-extrabold tabular-nums text-[#5F5E5E]">{value}</p>
        {band ? <BandBadge band={band} /> : null}
      </div>
    </div>
  );
}

type BandBadgeProps = {
  band: "low" | "mid" | "high";
};

function BandBadge({ band }: BandBadgeProps): React.ReactElement {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold ${scoreBandBadgeClass(band)}`}
    >
      {scoreBandLabel(band)}
    </span>
  );
}
