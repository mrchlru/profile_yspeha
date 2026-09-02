"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import { EmployeeDashboardCharts } from "@/components/admin/EmployeeDashboardCharts";
import { CandidateLifecycleButtons } from "@/components/admin/CandidateLifecycleButtons";
import { Button } from "@/components/Button";
import { EmployeeFolderAdminActions } from "@/components/admin/EmployeeFolderAdminActions";
import { EmployeeFolderFilesPanel } from "@/components/admin/EmployeeFolderFilesPanel";
import { SubtestSimilarityAlertsPanel } from "@/components/admin/SubtestSimilarityAlertsPanel";
import type { EmployeeFolderDetail, EmployeeDocumentSlot } from "@/lib/admin/employeeFolderTypes";
import type {
  SubtestSimilarityAlert,
  SubtestSimilarityFolderSummary,
} from "@/lib/admin/similarityClusterTypes";
import type { EmployeeDashboardVisual } from "@/lib/admin/employeeDashboardTypes";
import { documentReportSource } from "@/lib/admin/employeeFolderKey";
import { ADMIN_ROLE_ADMIN } from "@/lib/admin/adminRoles";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { useAdminSession } from "@/hooks/useAdminSession";

/**
 * Карточка папки сотрудника с документами и дашбордом внизу страницы.
 */
export function EmployeeFolderView(): React.ReactElement {
  const params = useParams();
  const folderKey = decodeURIComponent(String(params.employeeKey ?? ""));
  const { session } = useAdminSession();
  const [folder, setFolder] = useState<EmployeeFolderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarityAlerts, setSimilarityAlerts] = useState<ReadonlyArray<SubtestSimilarityAlert>>([]);
  const [similaritySummary, setSimilaritySummary] = useState<SubtestSimilarityFolderSummary | null>(null);
  const [similarityThreshold, setSimilarityThreshold] = useState(65);
  const [similaritySoftThreshold, setSimilaritySoftThreshold] = useState(60);
  const [similarityCloseMinutes, setSimilarityCloseMinutes] = useState(30);
  const [similarityLoading, setSimilarityLoading] = useState(true);
  const isFullAdmin = session.status === "authenticated" && session.role === ADMIN_ROLE_ADMIN;

  const loadFolder = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/results?folderKey=${encodeURIComponent(folderKey)}`,
        { cache: "no-store" }
      );
      const body = (await res.json()) as { folder?: EmployeeFolderDetail; error?: string };
      if (!res.ok || !body.folder) {
        setError(body.error ?? "Папка не найдена.");
        setFolder(null);
        return;
      }
      setFolder(body.folder);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setFolder(null);
    } finally {
      setLoading(false);
    }
  }, [folderKey]);

  const loadSimilarityAlerts = useCallback(async (): Promise<void> => {
    if (!folderKey) {
      return;
    }
    setSimilarityLoading(true);
    try {
      const params = new URLSearchParams({ folderKey });
      const res = await fetch(`/api/admin/results/similarity?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as {
        alerts?: SubtestSimilarityAlert[];
        summary?: SubtestSimilarityFolderSummary;
        thresholdPercent?: number;
        softThresholdPercent?: number;
        closeCompletionMinutes?: number;
        error?: string;
      };
      if (!res.ok || !body.alerts) {
        setSimilarityAlerts([]);
        setSimilaritySummary(null);
        return;
      }
      setSimilarityAlerts(body.alerts);
      setSimilaritySummary(body.summary ?? null);
      if (typeof body.thresholdPercent === "number") {
        setSimilarityThreshold(body.thresholdPercent);
      }
      if (typeof body.softThresholdPercent === "number") {
        setSimilaritySoftThreshold(body.softThresholdPercent);
      }
      if (typeof body.closeCompletionMinutes === "number") {
        setSimilarityCloseMinutes(body.closeCompletionMinutes);
      }
    } catch {
      setSimilarityAlerts([]);
      setSimilaritySummary(null);
    } finally {
      setSimilarityLoading(false);
    }
  }, [folderKey]);

  useEffect(() => {
    if (folderKey) {
      void loadFolder();
      void loadSimilarityAlerts();
    }
  }, [folderKey, loadFolder, loadSimilarityAlerts]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className={`space-y-3 px-6 py-6 ${adminPanelCardClass}`}>
          <p className={adminPanelMutedTextClass}>Загрузка папки сотрудника…</p>
        </div>
        <div className={`px-6 py-6 ${adminPanelCardClass}`}>
          <h3 className={adminPanelSectionTitleClass}>Дашборд по сотруднику</h3>
          <div className="mt-4">
            <EmployeeDashboardCharts visual={_emptyVisualForSkeleton()} loading />
          </div>
        </div>
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <p className="text-sm font-medium text-red-700/90">{error ?? "Папка не найдена."}</p>
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>
          Назад
        </Button>
      </div>
    );
  }

  const reportDocuments = folder.documents.filter((doc) => doc.id !== "dashboard");
  const dashboardDoc = folder.documents.find((doc) => doc.id === "dashboard");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#8C8C8C]">
            Папка сотрудника
          </p>
          <h2 className="text-[24px] font-extrabold text-[#5F5E5E]">{folder.displayName}</h2>
          {folder.positionLevelLabel ? (
            <p className={`mt-2 ${adminPanelMutedTextClass}`}>
              Уровень должности: {folder.positionLevelLabel}
            </p>
          ) : null}
          {folder.pendingInvite ? (
            <p className="mt-2 text-[14px] font-medium text-amber-800">
              Приглашение выдано, скрининг ещё не пройден
            </p>
          ) : null}
        </div>
        <Link
          href="/admin/results"
          className="rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
        >
          ← К списку папок
        </Link>
      </div>

      {folder.key.startsWith("candidate:") ? (
        <CandidateLifecycleButtons
          folderKey={folderKey}
          lifecycleStatus={folder.lifecycleStatus}
          context="results"
          onChanged={loadFolder}
        />
      ) : null}

      <SubtestSimilarityAlertsPanel
        thresholdPercent={similarityThreshold}
        softThresholdPercent={similaritySoftThreshold}
        closeCompletionMinutes={similarityCloseMinutes}
        summary={similaritySummary}
        alerts={similarityAlerts}
        loading={similarityLoading}
      />

      {isFullAdmin && folder ? (
        <EmployeeFolderAdminActions
          folderKey={folderKey}
          displayName={folder.displayName}
          dataItems={folder.dataItems}
          onDataChanged={loadFolder}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {reportDocuments.length === 0 ? (
          <div className={`px-5 py-5 ${adminPanelCardClass}`}>
            <p className={adminPanelMutedTextClass}>
              Сформированных отчётов в папке пока нет. После прохождения тестирования здесь появятся
              карточки доступных отчётов.
            </p>
          </div>
        ) : (
          reportDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              folderKey={folderKey}
              reportSessions={folder.reportSessions}
            />
          ))
        )}
      </div>

      <EmployeeFolderFilesPanel
        folderKey={folderKey}
        files={folder.uploadedFiles}
        isFullAdmin={isFullAdmin}
        onChanged={loadFolder}
      />

      {folder.burnoutSessions.length > 0 ? (
        <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
          <h3 className={adminPanelSectionTitleClass}>Тест на выгорание (Маслач)</h3>
          <ul className="space-y-3">
            {folder.burnoutSessions.map((session) => (
              <li
                key={session.sessionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white/70 px-4 py-3"
              >
                <div>
                  <p className="font-bold text-[#5F5E5E]">{session.label}</p>
                  {session.classicBurnout ? (
                    <p className="mt-1 text-[13px] font-medium text-red-700">
                      Классическая картина выгорания
                    </p>
                  ) : session.hasConcerningScale ? (
                    <p className="mt-1 text-[13px] font-medium text-amber-800">
                      Отдельные показатели требуют внимания
                    </p>
                  ) : (
                    <p className="mt-1 text-[13px] font-medium text-emerald-800">
                      Выраженного выгорания не выявлено
                    </p>
                  )}
                </div>
                <Link
                  href={`/admin/results/${encodeURIComponent(folderKey)}/burnout/${encodeURIComponent(session.sessionId)}`}
                  className="inline-flex rounded-full bg-[#00B596] px-4 py-2 text-[14px] font-bold text-white transition hover:bg-[#009f84]"
                >
                  Интерпретация
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {folder.profSbEducationSessions.length > 0 ? (
        <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
          <h3 className={adminPanelSectionTitleClass}>ПРОФ СБ + ПРОФ образование</h3>
          <ul className="space-y-3">
            {folder.profSbEducationSessions.map((session) => (
              <li
                key={session.sessionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white/70 px-4 py-3"
              >
                <div>
                  <p className="font-bold text-[#5F5E5E]">{session.label}</p>
                  {session.pendingMethodology ? (
                    <p className="mt-1 text-[13px] font-medium text-amber-800">
                      Методика и интерпретация — в разработке
                    </p>
                  ) : (
                    <p className="mt-1 text-[13px] font-medium text-emerald-800">
                      Интерпретация доступна
                    </p>
                  )}
                </div>
                <Link
                  href={`/admin/results/${encodeURIComponent(folderKey)}/prof-sb-education/${encodeURIComponent(session.sessionId)}`}
                  className="inline-flex rounded-full bg-[#00B596] px-4 py-2 text-[14px] font-bold text-white transition hover:bg-[#009f84]"
                >
                  Результат
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {dashboardDoc ? (
        <EmployeeDashboardPanel doc={dashboardDoc} visual={folder.dashboardVisual} />
      ) : null}
    </div>
  );
}

function EmployeeDashboardPanel({
  doc,
  visual,
}: {
  doc: EmployeeDocumentSlot;
  visual: EmployeeFolderDetail["dashboardVisual"];
}): React.ReactElement {
  return (
    <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className={adminPanelSectionTitleClass}>{doc.title}</h3>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-bold text-emerald-800">
          Есть данные
        </span>
      </div>
      <EmployeeDashboardCharts visual={visual} />
    </div>
  );
}

function DocumentCard({
  doc,
  folderKey,
  reportSessions,
}: {
  doc: EmployeeDocumentSlot;
  folderKey: string;
  reportSessions: EmployeeFolderDetail["reportSessions"];
}): React.ReactElement {
  const reportHref = _buildDocumentReportHref(doc, folderKey, reportSessions);

  return (
    <div className={`px-5 py-5 ${adminPanelCardClass}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className={adminPanelSectionTitleClass}>{doc.title}</h3>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-bold text-emerald-800">
          Есть данные
        </span>
      </div>
      <p className={`mt-2 ${adminPanelMutedTextClass}`}>{doc.description}</p>
      {reportHref ? (
        <Link
          href={reportHref}
          className="mt-4 inline-flex rounded-full bg-[#00B596] px-4 py-2 text-[14px] font-bold text-white transition hover:bg-[#009f84]"
        >
          Открыть отчёт
        </Link>
      ) : null}
    </div>
  );
}

function _buildDocumentReportHref(
  doc: EmployeeDocumentSlot,
  folderKey: string,
  reportSessions: EmployeeFolderDetail["reportSessions"]
): string | null {
  if (!doc.available || doc.viewKind === "none") {
    return null;
  }

  const source = documentReportSource(doc.id, folderKey);
  if (!source) {
    return null;
  }

  const session = reportSessions.find((item) => item.source === source);
  if (!session) {
    return null;
  }

  const query = new URLSearchParams({ sessionId: session.sessionId });
  return `/admin/results/${encodeURIComponent(folderKey)}/report/${encodeURIComponent(doc.id)}?${query.toString()}`;
}

function _emptyVisualForSkeleton(): EmployeeDashboardVisual {
  return {
    sessionId: null,
    sessionLabel: null,
    previousSessionLabel: null,
    hasData: false,
    hasPrevious: false,
    criticalAlerts: [],
    kpiCards: [],
    radar: null,
    gauges: [],
    profileMetrics: [],
    testCards: [],
    strengths: [],
    growthZones: [],
    intelligence: null,
    yoy: null,
    profileSummary: "",
    motivationSummary: "",
    sectarianSection: null,
  };
}
