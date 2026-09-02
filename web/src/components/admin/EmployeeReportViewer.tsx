"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DocumentViewerActionBar } from "@/components/admin/DocumentViewerActionBar";
import { EmployeeDashboardCharts } from "@/components/admin/EmployeeDashboardCharts";

import type { EmployeeDocumentSlotId } from "@/lib/admin/employeeFolderTypes";
import type { ReportHtmlView } from "@/lib/admin/buildReportHtmlView";
import type { AuditReportManagerMaslachBrief } from "@/lib/audit/report/auditReportTypes";
import type { EmployeeDashboardVisual } from "@/lib/admin/employeeDashboardTypes";
import { documentReportSource } from "@/lib/admin/employeeFolderKey";
import {
  downloadFileFromUrl,
  downloadHtmlFile,
  printHtmlFragment,
  printIframeContent,
} from "@/lib/admin/documentViewerActions";
import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";
import { maslachManagerTrafficLightStyle } from "@/lib/burnout/maslachManagerTrafficLightStyles";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";

const DOCUMENT_TITLES: Record<EmployeeDocumentSlotId, string> = {
  resume: "Резюме",
  short_report: "Короткий отчёт",
  full_report: "Объёмный отчёт",
  manager_report: "Отчёт для руководителя",
  violations_report: "Отчёт по нарушениям",
  commission_reports: "Отчёты комиссии",
  dashboard: "Дашборд по сотруднику",
};

function isDocumentId(value: string): value is EmployeeDocumentSlotId {
  return value in DOCUMENT_TITLES;
}

/**
 * Просмотр отчёта сотрудника в админ-панели (HTML или PDF).
 */
export function EmployeeReportViewer(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderKey = decodeURIComponent(String(params.employeeKey ?? ""));
  const documentParam = decodeURIComponent(String(params.documentId ?? ""));
  const sessionId = searchParams.get("sessionId") ?? "";

  const [htmlView, setHtmlView] = useState<ReportHtmlView | null>(null);
  const [dashboardVisual, setDashboardVisual] = useState<EmployeeDashboardVisual | null>(null);
  const [sessions, setSessions] = useState<
    ReadonlyArray<{ sessionId: string; source: string; label: string; createdAt: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const documentId = isDocumentId(documentParam) ? documentParam : null;
  const isPdf = documentId === "full_report" || documentId === "manager_report";
  const isDashboard = documentId === "dashboard";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const htmlPrintRef = useRef<HTMLDivElement>(null);

  const buildReportHref = useCallback(
    (nextSessionId: string): string => {
      const query = new URLSearchParams({ sessionId: nextSessionId });
      return `/admin/results/${encodeURIComponent(folderKey)}/report/${encodeURIComponent(documentParam)}?${query.toString()}`;
    },
    [documentParam, folderKey]
  );

  const pdfUrl = useMemo(() => {
    if (!documentId || !sessionId || !isPdf) {
      return null;
    }
    const query = new URLSearchParams({
      folderKey,
      documentId,
      sessionId,
    });
    return `/api/admin/reports/pdf?${query.toString()}`;
  }, [documentId, folderKey, isPdf, sessionId]);

  const pdfDownloadUrl = useMemo(() => {
    if (!pdfUrl) {
      return null;
    }
    return `${pdfUrl}&download=1`;
  }, [pdfUrl]);

  const reportFileName = useMemo(() => {
    if (!documentId) {
      return "report";
    }
    const base = DOCUMENT_TITLES[documentId].replace(/\s+/g, "-");
    return isPdf ? `${base}.pdf` : `${base}.html`;
  }, [documentId, isPdf]);

  function handlePrint(): void {
    if (isPdf) {
      printIframeContent(iframeRef.current);
      return;
    }
    const html = htmlPrintRef.current?.innerHTML;
    if (!html || !documentId) {
      window.print();
      return;
    }
    printHtmlFragment(DOCUMENT_TITLES[documentId], html);
  }

  function handleDownload(): void {
    if (isPdf && pdfDownloadUrl) {
      downloadFileFromUrl(pdfDownloadUrl, reportFileName);
      return;
    }
    const html = htmlPrintRef.current?.innerHTML;
    if (!html || !documentId) {
      return;
    }
    downloadHtmlFile(reportFileName, DOCUMENT_TITLES[documentId], html);
  }

  useEffect(() => {
    async function load(): Promise<void> {
      if (!folderKey || !documentId) {
        setError("Некорректный адрес отчёта.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const folderRes = await fetch(
          `/api/admin/results?folderKey=${encodeURIComponent(folderKey)}`,
          { cache: "no-store" }
        );
        const folderBody = (await folderRes.json()) as {
          folder?: {
            reportSessions: ReadonlyArray<{
              sessionId: string;
              source: string;
              label: string;
              createdAt: string;
            }>;
            dashboardVisual?: EmployeeDashboardVisual;
          };
          error?: string;
        };
        if (!folderRes.ok || !folderBody.folder) {
          setError(folderBody.error ?? "Папка не найдена.");
          setLoading(false);
          return;
        }

        const source = documentReportSource(documentId, folderKey);
        const compatibleSessions =
          documentId === "violations_report"
            ? [{ sessionId: "folder", source: "proctor", label: "Все прохождения", createdAt: "" }]
            : folderBody.folder.reportSessions.filter((item) => item.source === source);
        setSessions(compatibleSessions);

        const activeSessionId =
          documentId === "violations_report"
            ? "folder"
            : sessionId || compatibleSessions[0]?.sessionId || "";
        if (!activeSessionId) {
          setError("Нет доступных сессий для просмотра отчёта.");
          setLoading(false);
          return;
        }

        if (!sessionId && compatibleSessions[0]) {
          router.replace(buildReportHref(compatibleSessions[0].sessionId));
          return;
        }

        if (isDashboard) {
          setDashboardVisual(folderBody.folder.dashboardVisual ?? null);
          setHtmlView(null);
          setLoading(false);
          return;
        }

        if (isPdf) {
          setHtmlView(null);
          setLoading(false);
          return;
        }

        setDashboardVisual(null);
        const viewRes = await fetch(
          `/api/admin/reports/view?folderKey=${encodeURIComponent(folderKey)}&documentId=${encodeURIComponent(documentId)}&sessionId=${encodeURIComponent(activeSessionId)}`,
          { cache: "no-store" }
        );
        const viewBody = (await viewRes.json()) as { view?: ReportHtmlView; error?: string };
        if (!viewRes.ok || !viewBody.view) {
          setError(viewBody.error ?? "Не удалось загрузить отчёт.");
          setLoading(false);
          return;
        }
        setHtmlView(viewBody.view);
      } catch {
        setError("Сеть недоступна. Попробуйте ещё раз.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [buildReportHref, documentId, folderKey, isDashboard, isPdf, router, sessionId]);

  if (!documentId) {
    return <p className={adminPanelMutedTextClass}>Неизвестный тип отчёта.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#8C8C8C]">
            Просмотр отчёта
          </p>
          <h2 className="text-[24px] font-extrabold text-[#5F5E5E]">
            {DOCUMENT_TITLES[documentId]}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!loading && !error && !isPdf && !isDashboard ? (
            <DocumentViewerActionBar onPrint={handlePrint} onDownload={handleDownload} />
          ) : null}
          <Link
            href={`/admin/results/${encodeURIComponent(folderKey)}`}
            className="rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
          >
            ← К папке
          </Link>
        </div>
      </div>

      {sessions.length > 1 ? (
        <div className={`px-5 py-4 ${adminPanelCardClass}`}>
          <p className={`${adminPanelMutedTextClass} mb-2`}>Выберите прохождение:</p>
          <div className="flex flex-wrap gap-2">
            {sessions.map((item) => (
              <Link
                key={item.sessionId}
                href={buildReportHref(item.sessionId)}
                className={`rounded-full px-4 py-2 text-[13px] font-bold ${
                  (sessionId || sessions[0]?.sessionId) === item.sessionId
                    ? "bg-[#00B596] text-white"
                    : "bg-white/70 text-[#5F5E5E]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? <p className={adminPanelMutedTextClass}>Загрузка отчёта…</p> : null}
      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && isPdf && pdfUrl ? (
        <div className={`overflow-hidden ${adminPanelCardClass}`}>
          <iframe
            ref={iframeRef}
            title={DOCUMENT_TITLES[documentId]}
            src={pdfUrl}
            className="h-[80vh] w-full border-0 bg-white"
          />
        </div>
      ) : null}

      {isDashboard ? (
        <div ref={htmlPrintRef} className={`px-6 py-6 ${adminPanelCardClass}`}>
          {dashboardVisual ? (
            <EmployeeDashboardCharts visual={dashboardVisual} loading={loading} />
          ) : (
            <EmployeeDashboardCharts visual={_emptyDashboardVisual()} loading={loading} />
          )}
        </div>
      ) : null}

      {!loading && !error && htmlView ? (
        <div ref={htmlPrintRef}>
          <ReportHtmlContent view={htmlView} folderKey={folderKey} />
        </div>
      ) : null}
    </div>
  );
}

function ReportHtmlContent({
  view,
  folderKey,
}: {
  view: ReportHtmlView;
  folderKey: string;
}): React.ReactElement {
  if (view.kind === "violations_report") {
    return <ViolationsReportContent view={view} folderKey={folderKey} />;
  }

  if (view.kind === "screening_brief") {
    return (
      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <h3 className={adminPanelSectionTitleClass}>{view.title}</h3>
        <p className={adminPanelMutedTextClass}>
          {view.profileName} ·{" "}
          {formatMoscowDateTime(view.createdAt)}
        </p>
        <div className="rounded-2xl bg-white/70 px-4 py-4">
          <p className="font-bold text-[#5F5E5E]">
            КОТ: {String(view.kotIp)} / {String(view.maxScore)} — {view.kotIpLevelLabel}
          </p>
          <p className={`mt-2 ${adminPanelMutedTextClass}`}>{view.kotIpNormNote}</p>
        </div>
        {view.conclusionText ? (
          <section>
            <h4 className="text-[14px] font-extrabold text-[#8C8C8C]">Заключение</h4>
            <p className={`mt-2 whitespace-pre-wrap ${adminPanelMutedTextClass}`}>
              {view.conclusionText}
            </p>
          </section>
        ) : null}
        {view.hiringRecommendations ? (
          <section>
            <h4 className="text-[14px] font-extrabold text-[#8C8C8C]">Рекомендации по найму</h4>
            <p className={`mt-2 whitespace-pre-wrap ${adminPanelMutedTextClass}`}>
              {view.hiringRecommendations}
            </p>
          </section>
        ) : null}
      </div>
    );
  }

  if (view.kind === "audit_brief") {
    return (
      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <h3 className={adminPanelSectionTitleClass}>{view.title}</h3>
        <p className={adminPanelMutedTextClass}>
          {view.fullName} ·{" "}
          {formatMoscowDateTime(view.createdAt)}
        </p>
        {view.burnoutPiCritical ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Критически высокое психоэмоциональное истощение (ПИ ≥ 40)
          </p>
        ) : null}
        <ul className="space-y-3">
          {view.testLines.map((line) => (
            <li
              key={line.title}
              className={`rounded-2xl px-4 py-3 ${
                line.danger ? "bg-red-50 ring-1 ring-red-200" : "bg-white/70"
              }`}
            >
              <p
                className={`font-bold ${
                  line.danger ? "text-red-700" : "text-[#5F5E5E]"
                }`}
              >
                {line.title}
              </p>
              {line.alertHeadline ? (
                <p className="mt-1 text-sm font-bold text-red-700">{line.alertHeadline}</p>
              ) : null}
              {line.alertFootnote ? (
                <p className="mt-1 text-xs italic text-[#1B1B1B]">{line.alertFootnote}</p>
              ) : line.maslachBrief ? (
                <MaslachManagerBriefBlock brief={line.maslachBrief} />
              ) : line.briefAnswer ? (
                <p
                  className={`mt-1 ${
                    line.danger ? "font-semibold text-red-700" : adminPanelMutedTextClass
                  }`}
                >
                  {line.briefAnswer}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        {view.aiConclusion ? (
          <section>
            <h4 className="text-[14px] font-extrabold text-[#8C8C8C]">ИИ-заключение для руководителя</h4>
            <p className={`mt-2 whitespace-pre-wrap ${adminPanelMutedTextClass}`}>
              {view.aiConclusion}
            </p>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
      <h3 className={adminPanelSectionTitleClass}>{view.title}</h3>
      <p className={adminPanelMutedTextClass}>
        {view.fullName} ·{" "}
        {formatMoscowDateTime(view.createdAt)}
      </p>
      {view.metrics.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {view.metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-white/70 px-4 py-3">
              <p className="text-[13px] font-extrabold text-[#8C8C8C]">{metric.label}</p>
              <p className="mt-1 text-[20px] font-extrabold text-[#5F5E5E]">{String(metric.value)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className={adminPanelMutedTextClass}>Метрики пока не сформированы.</p>
      )}
      {view.yearOverYearNote ? (
        <section>
          <h4 className="text-[14px] font-extrabold text-[#8C8C8C]">Динамика год к году</h4>
          <p className={`mt-2 whitespace-pre-wrap ${adminPanelMutedTextClass}`}>
            {view.yearOverYearNote}
          </p>
        </section>
      ) : null}
      {view.managerConclusion ? (
        <section>
          <h4 className="text-[14px] font-extrabold text-[#8C8C8C]">Краткое заключение</h4>
          <p className={`mt-2 whitespace-pre-wrap ${adminPanelMutedTextClass}`}>
            {view.managerConclusion}
          </p>
        </section>
      ) : null}
      {view.aiConclusion ? (
        <section>
          <h4 className="text-[14px] font-extrabold text-[#8C8C8C]">Полное ИИ-заключение</h4>
          <p className={`mt-2 whitespace-pre-wrap ${adminPanelMutedTextClass}`}>
            {view.aiConclusion}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function MaslachManagerBriefBlock({
  brief,
}: {
  brief: AuditReportManagerMaslachBrief;
}): React.ReactElement {
  const overall = maslachManagerTrafficLightStyle(brief.overallTrafficLight);
  return (
    <div className="mt-3 space-y-3">
      <div className={`rounded-xl px-3 py-3 ring-1 ${overall.bg} ${overall.ring}`}>
        <p className={`text-sm font-extrabold ${overall.text}`}>{brief.overallTitle}</p>
        <p className={`mt-1 text-sm leading-relaxed ${overall.text}`}>{brief.overallText}</p>
      </div>
      {brief.scales.map((scale) => {
        const style = maslachManagerTrafficLightStyle(scale.trafficLight);
        return (
          <div
            key={scale.scaleTitle}
            className={`rounded-xl px-3 py-3 ring-1 ${style.bg} ${style.ring}`}
          >
            <p className={`text-sm font-extrabold ${style.text}`}>{scale.scaleTitle}</p>
            <p className={`mt-1 text-xs leading-relaxed opacity-90 ${style.text}`}>
              {scale.whatItMeasures}
            </p>
            <p className={`mt-2 text-sm font-bold ${style.text}`}>{scale.statusLabel}</p>
            <p className={`mt-1 text-sm leading-relaxed ${style.text}`}>{scale.managerMeaning}</p>
          </div>
        );
      })}
    </div>
  );
}

function ViolationsReportContent({
  view,
  folderKey,
}: {
  view: Extract<ReportHtmlView, { kind: "violations_report" }>;
  folderKey: string;
}): React.ReactElement {
  return (
    <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
      <h3 className={adminPanelSectionTitleClass}>{view.title}</h3>
      <p className={adminPanelMutedTextClass}>
        {view.fullName} · {formatMoscowDateTime(view.createdAt)} · МСК
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/70 px-4 py-3">
          <p className="text-[13px] font-extrabold text-[#8C8C8C]">Звуковые нарушения</p>
          <p className="mt-1 text-[24px] font-extrabold text-[#5F5E5E]">
            {view.summary.audioViolations}
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 px-4 py-3">
          <p className="text-[13px] font-extrabold text-[#8C8C8C]">Видеонарушения</p>
          <p className="mt-1 text-[24px] font-extrabold text-[#5F5E5E]">
            {view.summary.videoViolations}
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 px-4 py-3">
          <p className="text-[13px] font-extrabold text-[#8C8C8C]">Всего</p>
          <p className="mt-1 text-[24px] font-extrabold text-[#5F5E5E]">
            {view.summary.totalViolations}
          </p>
        </div>
      </div>

      {view.testsWithViolations.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4">
          <h4 className="text-[14px] font-extrabold text-amber-950">
            Нарушения зафиксированы в тестах
          </h4>
          <ul className="mt-2 space-y-1">
            {view.testsWithViolations.map((item) => (
              <li key={item.testLabel} className="text-[14px] text-amber-950">
                {item.testLabel} — {item.totalViolations}{" "}
                {item.totalViolations === 1 ? "нарушение" : "нарушений"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.sessions.map((sessionBlock) => (
        <section key={sessionBlock.sessionId} className="space-y-3">
          <div className="border-b border-black/10 pb-2">
            <h4 className="text-[16px] font-extrabold text-[#5F5E5E]">{sessionBlock.testLabel}</h4>
            <p className={`text-[13px] ${adminPanelMutedTextClass}`}>
              Старт {sessionBlock.startedAtMsk} МСК · нарушений:{" "}
              {sessionBlock.summary.totalViolations}
            </p>
          </div>

          {sessionBlock.sessionRecordingId ? (
            <div className="rounded-2xl border border-black/8 bg-white/70 px-4 py-3">
              <p className="font-bold text-[#5F5E5E]">Запись звука за прохождение</p>
              <p className={`mt-1 text-[13px] ${adminPanelMutedTextClass}`}>
                Непрерывная аудиозапись сессии прокторинга
                {sessionBlock.sessionRecordingDurationMs
                  ? ` · ${_formatRecordingDuration(sessionBlock.sessionRecordingDurationMs)}`
                  : null}
              </p>
              <audio
                controls
                preload="none"
                className="mt-3 w-full max-w-md"
                src={`/api/admin/proctor/session-audio/${encodeURIComponent(sessionBlock.sessionId)}?folderKey=${encodeURIComponent(folderKey)}`}
              />
              <a
                href={`/api/admin/proctor/session-audio/${encodeURIComponent(sessionBlock.sessionId)}?folderKey=${encodeURIComponent(folderKey)}&download=1`}
                className="mt-2 inline-block text-[13px] font-semibold text-[#00B596] hover:underline"
              >
                Скачать запись (.webm)
              </a>
            </div>
          ) : null}

          {sessionBlock.events.length === 0 ? (
            <p className={adminPanelMutedTextClass}>Нарушений в этом прохождении нет.</p>
          ) : (
            <ul className="space-y-3">
              {sessionBlock.events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-2xl border border-black/8 bg-white/70 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#5F5E5E]">{event.kindLabel}</p>
                      <p className={`mt-1 text-[13px] ${adminPanelMutedTextClass}`}>
                        {event.occurredAtMsk} МСК ·{" "}
                        {event.category === "audio"
                          ? "Звук"
                          : event.category === "identity"
                            ? "Проверка личности"
                            : "Видео"}
                        {event.stepLabel ? ` · ${event.stepLabel}` : null}
                      </p>
                      {(event.clientFaceCount !== null ||
                        event.serverPersonCount !== null ||
                        event.serverPhoneCount !== null) && (
                        <p className={`mt-1 text-[13px] ${adminPanelMutedTextClass}`}>
                          {event.clientFaceCount !== null
                            ? `Лиц (браузер): ${event.clientFaceCount}`
                            : null}
                          {event.serverPersonCount !== null
                            ? `${event.clientFaceCount !== null ? " · " : ""}Людей (YOLO): ${event.serverPersonCount}`
                            : event.serverFaceCount !== null
                              ? `${event.clientFaceCount !== null ? " · " : ""}Сервер: ${event.serverFaceCount}`
                              : null}
                          {event.serverPhoneCount !== null && event.serverPhoneCount > 0
                            ? ` · Телефонов: ${event.serverPhoneCount}`
                            : null}
                          {event.serverVerified === true ? " · подтверждено" : null}
                          {event.serverVerified === false ? " · не подтверждено" : null}
                        </p>
                      )}
                    </div>
                  </div>
                  {event.snapshotId ? (
                    <img
                      src={`/api/admin/proctor/snapshot/${encodeURIComponent(event.snapshotId)}?folderKey=${encodeURIComponent(folderKey)}`}
                      alt={`Снимок: ${event.kindLabel}`}
                      className="mt-3 max-h-64 rounded-xl border border-black/10 object-contain"
                    />
                  ) : null}
                  {event.audioClipId ? (
                    <div className="mt-3 space-y-2">
                      <audio
                        controls
                        preload="none"
                        className="w-full max-w-md"
                        src={`/api/admin/proctor/audio/${encodeURIComponent(event.audioClipId)}?folderKey=${encodeURIComponent(folderKey)}`}
                      />
                      <a
                        href={`/api/admin/proctor/audio/${encodeURIComponent(event.audioClipId)}?folderKey=${encodeURIComponent(folderKey)}&download=1`}
                        className="text-[13px] font-semibold text-[#00B596] underline"
                      >
                        Скачать запись (WebM)
                      </a>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function _formatRecordingDuration(durationMs: number): string {
  const totalSec = Math.max(0, Math.round(durationMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function _emptyDashboardVisual(): EmployeeDashboardVisual {
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
