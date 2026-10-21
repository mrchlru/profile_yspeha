"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import { EmployeeDashboardCharts } from "@/components/admin/EmployeeDashboardCharts";
import { RegenerateDocumentReportButton } from "@/components/admin/RegenerateDocumentReportButton";
import { CandidateLifecycleButtons } from "@/components/admin/CandidateLifecycleButtons";
import { Button } from "@/components/Button";
import { EmployeeFolderAdminActions } from "@/components/admin/EmployeeFolderAdminActions";
import { EmployeeFolderFilesPanel } from "@/components/admin/EmployeeFolderFilesPanel";
import { SubtestSimilarityAlertsPanel } from "@/components/admin/SubtestSimilarityAlertsPanel";
import type { EmployeeFolderDetail, EmployeeDocumentSlot } from "@/lib/admin/employeeFolderTypes";
import { documentReportSourceCandidates } from "@/lib/admin/documentReportSource";
import type {
  SubtestSimilarityAlert,
  SubtestSimilarityFolderSummary,
} from "@/lib/admin/similarityClusterTypes";
import type { EmployeeDashboardVisual } from "@/lib/admin/employeeDashboardTypes";
import { ADMIN_ROLE_ADMIN } from "@/lib/admin/adminRoles";
import { AdminFolderSectionNav } from "@/components/admin/AdminFolderSectionNav";
import { AdminStatusChip } from "@/components/admin/ui/AdminUi";
import {
  adminTextBackLinkClass,
  adminBadgeReadyClass,
  adminCompactPrimaryLinkClass,
  adminFolderPersonNameClass,
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
  adminSectionHeadingClass,
} from "@/lib/admin/adminPanelTheme";
import { formatPersonMetaLine, formatPersonName } from "@/lib/admin/formatPersonDisplay";
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
  const hasSessions =
    folder.burnoutSessions.length > 0 ||
    folder.specialistScreeningSessions.length > 0 ||
    folder.attestationSessions.length > 0 ||
    folder.profSbEducationSessions.length > 0 ||
    folder.reportSessions.length > 0;
  const hasRisks = !similarityLoading && similarityAlerts.length > 0 && similaritySummary !== null;
  const personName = formatPersonName(folder);
  const metaLine = formatPersonMetaLine(folder);

  return (
    <div className="mx-auto max-w-[920px] space-y-6">
      <Link href="/admin/results" className={adminTextBackLinkClass}>
        ‹ Результаты
      </Link>

      <div className="flex flex-wrap items-start gap-5">
        <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--admin-avatar-bg-side)] text-[26px] font-semibold text-[var(--admin-accent)]">
          {_folderInitials(folder)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={adminFolderPersonNameClass}>{personName}</h2>
          {metaLine ? <p className="mt-2 text-[14px] text-[var(--admin-text-3)]">{metaLine}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AdminStatusChip label="Результаты" tone="ok" />
            {folder.pendingInvite ? (
              <AdminStatusChip label="Ожидает скрининг" tone="warn" />
            ) : null}
          </div>
        </div>
      </div>

      <AdminFolderSectionNav
        visible={{
          risks: hasRisks,
          dash: Boolean(dashboardDoc),
          sessions: hasSessions,
        }}
      />

      {folder.key.startsWith("candidate:") ? (
        <CandidateLifecycleButtons
          folderKey={folderKey}
          lifecycleStatus={folder.lifecycleStatus}
          context="results"
          onChanged={loadFolder}
        />
      ) : null}

      <div id="risks">
        <SubtestSimilarityAlertsPanel
          thresholdPercent={similarityThreshold}
          softThresholdPercent={similaritySoftThreshold}
          closeCompletionMinutes={similarityCloseMinutes}
          summary={similaritySummary}
          alerts={similarityAlerts}
          loading={similarityLoading}
          variant="folder"
        />
      </div>

      <section id="docs" className="space-y-4 scroll-mt-24">
        <h3 className={adminSectionHeadingClass}>Документы</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {reportDocuments.length === 0 ? (
            <div className={`px-5 py-5 ${adminPanelCardClass}`}>
              <p className={adminPanelMutedTextClass}>
                Сформированных отчётов в папке пока нет. После прохождения тестирования здесь
                появятся карточки доступных отчётов.
              </p>
            </div>
          ) : (
            reportDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                folderKey={folderKey}
                reportSessions={folder.reportSessions}
                attestationSessions={folder.attestationSessions}
                onRegenerated={loadFolder}
              />
            ))
          )}
        </div>
      </section>

      {hasSessions ? (
        <section id="sessions" className="space-y-3 scroll-mt-24">
          <h3 className={adminSectionHeadingClass}>Прохождения</h3>
          <div className={`overflow-hidden ${adminPanelCardClass}`}>
            <ul className="divide-y divide-[var(--admin-hairline)]">
              {folder.reportSessions.map((session) => (
                <SessionRow
                  key={`report-${session.sessionId}-${session.source}`}
                  title={session.source === "audit" ? "Оценка деятельности" : "Скрининг"}
                  subtitle={session.label}
                  href={`/admin/results/${encodeURIComponent(folderKey)}/report/${session.source === "audit" ? "full_report" : "short_report"}?sessionId=${encodeURIComponent(session.sessionId)}`}
                  actionLabel="Открыть"
                  done
                />
              ))}
              {folder.burnoutSessions.map((session) => (
                <SessionRow
                  key={`burnout-${session.sessionId}`}
                  title="Выгорание (Маслач)"
                  subtitle={session.label}
                  href={`/admin/results/${encodeURIComponent(folderKey)}/burnout/${encodeURIComponent(session.sessionId)}`}
                  actionLabel="Интерпретация"
                />
              ))}
              {folder.attestationSessions.map((session) => (
                <SessionRow
                  key={`att-${session.sessionId}`}
                  title="Аттестация"
                  subtitle={session.label}
                  href={`/admin/results/${encodeURIComponent(folderKey)}/attestation/${encodeURIComponent(session.sessionId)}`}
                  actionLabel="Отчёт"
                  done={session.hasReport}
                />
              ))}
              {folder.specialistScreeningSessions.map((session) => (
                <SessionRow
                  key={`spec-${session.sessionId}`}
                  title="Спец. скрининг"
                  subtitle={session.label}
                  href={`/admin/results/${encodeURIComponent(folderKey)}/specialist-screening/${encodeURIComponent(session.sessionId)}`}
                  actionLabel="Отчёт"
                  confidential
                />
              ))}
              {folder.profSbEducationSessions.map((session) => (
                <SessionRow
                  key={`prof-${session.sessionId}`}
                  title="ПРОФ СБ + образование"
                  subtitle={session.label}
                  href={`/admin/results/${encodeURIComponent(folderKey)}/prof-sb-education/${encodeURIComponent(session.sessionId)}`}
                  actionLabel="Результат"
                />
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section id="files" className="scroll-mt-24">
        <EmployeeFolderFilesPanel
          folderKey={folderKey}
          files={folder.uploadedFiles}
          isFullAdmin={isFullAdmin}
          onChanged={loadFolder}
        />
      </section>

      {dashboardDoc ? (
        <section id="dash" className="scroll-mt-24">
          <EmployeeDashboardPanel
            doc={dashboardDoc}
            visual={folder.dashboardVisual}
            folderKey={folderKey}
            onRegenerated={loadFolder}
          />
        </section>
      ) : null}

      {isFullAdmin ? (
        <section id="danger" className="scroll-mt-24 pt-4">
          <EmployeeFolderAdminActions
            folderKey={folderKey}
            displayName={folder.displayName}
            dataItems={folder.dataItems}
            onDataChanged={loadFolder}
            variant="dangerZone"
          />
        </section>
      ) : null}
    </div>
  );
}

function EmployeeDashboardPanel({
  doc,
  visual,
  folderKey,
  onRegenerated,
}: {
  doc: EmployeeDocumentSlot;
  visual: EmployeeFolderDetail["dashboardVisual"];
  folderKey: string;
  onRegenerated: () => void | Promise<void>;
}): React.ReactElement {
  const dashboardSessionId = visual.sessionId ?? "";
  return (
    <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className={adminPanelSectionTitleClass}>{doc.title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {dashboardSessionId ? (
            <RegenerateDocumentReportButton
              folderKey={folderKey}
              sessionId={dashboardSessionId}
              kind="folder_document"
              documentId="dashboard"
              label="Перегенерировать дашборд"
              onSuccess={onRegenerated}
            />
          ) : null}
          <span className={adminBadgeReadyClass}>Есть данные</span>
        </div>
      </div>
      <EmployeeDashboardCharts visual={visual} />
    </div>
  );
}

function DocumentCard({
  doc,
  folderKey,
  reportSessions,
  attestationSessions,
  onRegenerated,
}: {
  doc: EmployeeDocumentSlot;
  folderKey: string;
  reportSessions: EmployeeFolderDetail["reportSessions"];
  attestationSessions: EmployeeFolderDetail["attestationSessions"];
  onRegenerated: () => void | Promise<void>;
}): React.ReactElement {
  const reportHref = _buildDocumentReportHref(
    doc,
    folderKey,
    reportSessions,
    attestationSessions
  );
  const regenerateTarget = _resolveDocumentRegenerateTarget(
    doc,
    folderKey,
    reportSessions,
    attestationSessions
  );

  const unavailable = !doc.available || doc.viewKind === "none";
  const isLocked =
    doc.id === "attestation_brief_report" || doc.id === "commission_reports";

  return (
    <div
      className={`flex min-h-[132px] flex-col px-5 py-5 ${adminPanelCardClass} ${
        unavailable ? "bg-[#EEEEF1]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[17px] font-semibold text-[var(--admin-text)]">{doc.title}</h3>
        <div className="flex items-center gap-2">
          {isLocked ? (
            <span className="text-[var(--admin-text-3)]" title="Конфиденциально" aria-label="Конфиденциально">
              🔒
            </span>
          ) : null}
          {doc.available ? (
            <span className={adminBadgeReadyClass}>Готов</span>
          ) : (
            <span className="rounded-full bg-[var(--admin-neutral-bg)] px-3 py-1 text-[12px] font-semibold text-[var(--admin-neutral)]">
              Нет данных
            </span>
          )}
        </div>
      </div>
      <p className={`mt-2 flex-1 ${adminPanelMutedTextClass}`}>{doc.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {reportHref && !unavailable ? (
          reportHref.startsWith("/api/") ? (
            <a href={reportHref} className={adminCompactPrimaryLinkClass}>
              Скачать Word
            </a>
          ) : (
            <Link href={reportHref} className={adminCompactPrimaryLinkClass}>
              Открыть
            </Link>
          )
        ) : null}
        {regenerateTarget ? (
          <RegenerateDocumentReportButton
            folderKey={folderKey}
            sessionId={regenerateTarget.sessionId}
            kind={regenerateTarget.kind}
            documentId={regenerateTarget.documentId}
            className="rounded-full bg-white/80 px-4 py-2 text-[13px] font-bold text-[#5F5E5E] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.12)] disabled:opacity-50"
            onSuccess={onRegenerated}
          />
        ) : null}
      </div>
    </div>
  );
}

function _resolveDocumentRegenerateTarget(
  doc: EmployeeDocumentSlot,
  folderKey: string,
  reportSessions: EmployeeFolderDetail["reportSessions"],
  attestationSessions: EmployeeFolderDetail["attestationSessions"]
):
  | {
      sessionId: string;
      kind: "folder_document" | "attestation";
      documentId?: EmployeeDocumentSlot["id"];
    }
  | null {
  if (!doc.available || doc.viewKind === "none") {
    return null;
  }
  if (doc.id === "resume" || doc.id === "commission_reports") {
    return null;
  }
  if (doc.id === "attestation_report" || doc.id === "attestation_brief_report") {
    const latest = attestationSessions[0];
    if (!latest) {
      return null;
    }
    return { sessionId: latest.sessionId, kind: "attestation" };
  }
  if (doc.id === "violations_report") {
    return {
      sessionId: "folder",
      kind: "folder_document",
      documentId: "violations_report",
    };
  }
  const sources = documentReportSourceCandidates(doc.id, folderKey);
  const session = sources
    .map((source) => reportSessions.find((item) => item.source === source))
    .find((item): item is NonNullable<typeof item> => Boolean(item));
  if (!session) {
    return null;
  }
  return {
    sessionId: session.sessionId,
    kind: "folder_document",
    documentId: doc.id,
  };
}

function _buildDocumentReportHref(
  doc: EmployeeDocumentSlot,
  folderKey: string,
  reportSessions: EmployeeFolderDetail["reportSessions"],
  attestationSessions: EmployeeFolderDetail["attestationSessions"]
): string | null {
  if (!doc.available || doc.viewKind === "none") {
    return null;
  }

  if (doc.id === "attestation_report") {
    const latest = attestationSessions[0];
    if (!latest) {
      return null;
    }
    return `/admin/results/${encodeURIComponent(folderKey)}/attestation/${encodeURIComponent(latest.sessionId)}`;
  }

  if (doc.id === "attestation_brief_report") {
    const latest = attestationSessions.find((session) => session.hasBriefReport) ?? attestationSessions[0];
    if (!latest) {
      return null;
    }
    const query = new URLSearchParams({ folderKey, sessionId: latest.sessionId });
    return `/api/admin/attestation-report/brief-docx?${query.toString()}`;
  }

  // Отчёт по нарушениям строится по всей папке (proctor), а не по audit/screening-сессии.
  if (doc.id === "violations_report") {
    const query = new URLSearchParams({ sessionId: "folder" });
    return `/admin/results/${encodeURIComponent(folderKey)}/report/${encodeURIComponent(doc.id)}?${query.toString()}`;
  }

  const sources = documentReportSourceCandidates(doc.id, folderKey);
  const session = sources
    .map((source) => reportSessions.find((item) => item.source === source))
    .find((item): item is NonNullable<typeof item> => Boolean(item));
  if (!session) {
    return null;
  }

  const query = new URLSearchParams({ sessionId: session.sessionId });
  return `/admin/results/${encodeURIComponent(folderKey)}/report/${encodeURIComponent(doc.id)}?${query.toString()}`;
}

type SessionRowProps = {
  title: string;
  subtitle: string;
  href: string;
  actionLabel: string;
  done?: boolean;
  confidential?: boolean;
};

function SessionRow({
  title,
  subtitle,
  href,
  actionLabel,
  done = true,
  confidential = false,
}: SessionRowProps): React.ReactElement {
  return (
    <li>
      <Link
        href={href}
        className="flex flex-wrap items-center gap-3 px-4 py-4 transition hover:bg-[var(--admin-accent-tint-2)] sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold text-[var(--admin-text)]">
            {title}
            {confidential ? (
              <span className="ml-2 text-[13px] font-normal text-[var(--admin-text-3)]">🔒</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-3)]">{subtitle}</p>
        </div>
        {done ? <AdminStatusChip label="Завершено" tone="ok" /> : null}
        <span className={adminCompactPrimaryLinkClass}>{actionLabel}</span>
        <span className="text-[var(--admin-chevron)]" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  );
}

function _folderInitials(folder: EmployeeFolderDetail): string {
  const a = folder.lastName?.trim().charAt(0) ?? "";
  const b = folder.firstName?.trim().charAt(0) ?? "";
  const pair = `${a}${b}`.toUpperCase();
  if (pair) {
    return pair;
  }
  return folder.displayName.trim().charAt(0).toUpperCase() || "?";
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
