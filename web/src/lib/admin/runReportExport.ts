import { buildBurnoutReportView } from "@/lib/admin/buildBurnoutReportView";

import { buildProfSbEducationReportView } from "@/lib/admin/buildProfSbEducationReportView";

import {

  dedupeReportExportFileNames,

  formatReportExportFileStem,

} from "@/lib/admin/formatReportExportFileName";

import {

  generateAuditReportDocxBySession,

  generateBurnoutReportDocxBySession,

  generateProfSbEducationReportDocxBySession,

  generateScreeningReportDocxBySession,

} from "@/lib/admin/generateReportExportDocxBySession";

import { generateAuditManagerReportPdfBySession } from "@/lib/admin/generateAuditManagerReportPdfBySession";

import { generateAuditReportPdfBySession } from "@/lib/admin/generateAuditReportPdfBySession";

import { generateScreeningReportPdfBySession } from "@/lib/admin/generateScreeningReportPdfBySession";

import { buildReportExportZip } from "@/lib/admin/buildReportExportZip";

import {

  listReportExportCandidates,

  resolveReportExportSessionsByFolderKeys,

} from "@/lib/admin/listReportExportCandidates";

import type {

  ReportExportFileFormat,

  ReportExportScope,

  ReportExportTestKind,

  ReportExportVariant,

} from "@/lib/admin/reportExportKinds";

import { formatMoscowDateTime } from "@/lib/datetime/moscowTime";



export type ReportExportRequest = {

  scope: ReportExportScope;

  testKind: ReportExportTestKind;

  variant: ReportExportVariant;

  fileFormat: ReportExportFileFormat;

  sessionIds?: ReadonlyArray<string>;

  folderKeys?: ReadonlyArray<string>;

};



export type ReportExportSuccess =

  | { kind: "single"; fileName: string; buffer: Buffer; contentType: string }

  | { kind: "archive"; fileName: string; buffer: Buffer; contentType: "application/zip" };



type BuiltExportFile = {

  fileName: string;

  buffer: Buffer;

  contentType: string;

};



/**

 * Собирает файлы отчётов по параметрам выгрузки.

 */

export async function runReportExport(

  request: ReportExportRequest

): Promise<ReportExportSuccess | null> {

  const targets = await _resolveExportTargets(request);

  if (targets.length === 0) {

    return null;

  }



  const builtNested = await Promise.all(

    targets.map((target) =>

      _buildExportFilesForTarget(

        request.testKind,

        request.variant,

        request.fileFormat,

        target

      )

    )

  );

  const built = builtNested.flat().filter((item) => item !== null);



  if (built.length === 0) {

    return null;

  }



  const rawNames = built.map((item) => item.fileName);

  const uniqueNames = dedupeReportExportFileNames(rawNames);

  const files = built.map((item, index) => ({

    fileName: uniqueNames[index] ?? item.fileName,

    data: item.buffer,

  }));



  if (files.length === 1) {

    const only = files[0];

    if (!only) {

      return null;

    }

    const meta = built[0];

    return {

      kind: "single",

      fileName: only.fileName,

      buffer: only.data,

      contentType: meta?.contentType ?? "application/octet-stream",

    };

  }



  const zipBuffer = buildReportExportZip(files);

  const stamp = formatMoscowDateTime(new Date()).replace(/[:\s]/g, "-").slice(0, 10);

  return {

    kind: "archive",

    fileName: `otchety_${request.testKind}_${stamp}.zip`,

    buffer: zipBuffer,

    contentType: "application/zip",

  };

}



type ExportTarget = {

  sessionId: string;

  lastName: string;

  firstName: string;

  completedAt: Date;

};



async function _resolveExportTargets(request: ReportExportRequest): Promise<ExportTarget[]> {

  if (request.scope === "all_latest") {

    const candidates = await listReportExportCandidates(request.testKind);

    return candidates.map((item) => ({

      sessionId: item.sessionId,

      lastName: item.lastName,

      firstName: item.firstName,

      completedAt: new Date(item.completedAt),

    }));

  }



  const bySession = new Map<string, ExportTarget>();



  if (request.sessionIds && request.sessionIds.length > 0) {

    const candidates = await listReportExportCandidates(request.testKind);

    const allowed = new Set(request.sessionIds);

    for (const item of candidates) {

      if (allowed.has(item.sessionId)) {

        bySession.set(item.sessionId, {

          sessionId: item.sessionId,

          lastName: item.lastName,

          firstName: item.firstName,

          completedAt: new Date(item.completedAt),

        });

      }

    }

  }



  if (request.folderKeys && request.folderKeys.length > 0) {

    const fromFolders = await resolveReportExportSessionsByFolderKeys(

      request.testKind,

      request.folderKeys

    );

    for (const item of fromFolders) {

      bySession.set(item.sessionId, {

        sessionId: item.sessionId,

        lastName: item.lastName,

        firstName: item.firstName,

        completedAt: new Date(item.completedAt),

      });

    }

  }



  return [...bySession.values()];

}



async function _buildExportFilesForTarget(

  testKind: ReportExportTestKind,

  variant: ReportExportVariant,

  fileFormat: ReportExportFileFormat,

  target: ExportTarget

): Promise<ReadonlyArray<BuiltExportFile>> {

  const stem = formatReportExportFileStem(

    target.lastName,

    target.firstName,

    target.completedAt

  );

  const wantPdf = fileFormat === "pdf" || fileFormat === "both";

  const wantDocx = fileFormat === "docx" || fileFormat === "both";

  const files: BuiltExportFile[] = [];



  if (testKind === "screening") {

    if (wantPdf) {

      const buffer = await generateScreeningReportPdfBySession(target.sessionId);

      if (buffer && buffer.length > 0) {

        files.push({ fileName: `${stem}.pdf`, buffer, contentType: "application/pdf" });

      }

    }

    if (wantDocx) {

      const buffer = await generateScreeningReportDocxBySession(target.sessionId);

      if (buffer && buffer.length > 0) {

        files.push({

          fileName: `${stem}.docx`,

          buffer,

          contentType:

            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        });

      }

    }

    return files;

  }



  if (testKind === "audit_middle" || testKind === "audit_senior") {

    if (wantPdf) {

      const buffer =

        variant === "manager"

          ? await generateAuditManagerReportPdfBySession(target.sessionId)

          : await generateAuditReportPdfBySession(target.sessionId);

      if (buffer && buffer.length > 0) {

        files.push({ fileName: `${stem}.pdf`, buffer, contentType: "application/pdf" });

      }

    }

    if (wantDocx) {

      const buffer = await generateAuditReportDocxBySession(target.sessionId, variant);

      if (buffer && buffer.length > 0) {

        files.push({

          fileName: `${stem}.docx`,

          buffer,

          contentType:

            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        });

      }

    }

    return files;

  }



  if (testKind === "burnout") {

    if (wantPdf) {

      const htmlFile = await _buildBurnoutExportHtmlFile(target.sessionId, stem);

      if (htmlFile) {

        files.push(htmlFile);

      }

    }

    if (wantDocx) {

      const buffer = await generateBurnoutReportDocxBySession(target.sessionId);

      if (buffer && buffer.length > 0) {

        files.push({

          fileName: `${stem}.docx`,

          buffer,

          contentType:

            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        });

      }

    }

    return files;

  }



  if (wantPdf) {

    const htmlFile = await _buildProfSbExportHtmlFile(target.sessionId, stem);

    if (htmlFile) {

      files.push(htmlFile);

    }

  }

  if (wantDocx) {

    const buffer = await generateProfSbEducationReportDocxBySession(target.sessionId);

    if (buffer && buffer.length > 0) {

      files.push({

        fileName: `${stem}.docx`,

        buffer,

        contentType:

          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      });

    }

  }

  return files;

}



async function _buildBurnoutExportHtmlFile(

  sessionId: string,

  stem: string

): Promise<BuiltExportFile | null> {

  const view = await buildBurnoutReportView(sessionId);

  if (!view) {

    return null;

  }

  const html = _buildBurnoutExportHtml(view);

  return {

    fileName: `${stem}.html`,

    buffer: Buffer.from(html, "utf-8"),

    contentType: "text/html; charset=utf-8",

  };

}



async function _buildProfSbExportHtmlFile(

  sessionId: string,

  stem: string

): Promise<BuiltExportFile | null> {

  const view = await buildProfSbEducationReportView(sessionId);

  if (!view) {

    return null;

  }

  const html = _buildProfSbExportHtml(view);

  return {

    fileName: `${stem}.html`,

    buffer: Buffer.from(html, "utf-8"),

    contentType: "text/html; charset=utf-8",

  };

}



function _buildBurnoutExportHtml(view: NonNullable<Awaited<ReturnType<typeof buildBurnoutReportView>>>): string {

  const rows = [view.interpretation.ee, view.interpretation.dp, view.interpretation.pa]

    .map(

      (row) =>

        `<tr><td>${_escapeHtml(row.title)}</td><td>${String(row.score)}</td><td>${_escapeHtml(row.levelLabel)}</td></tr>`

    )

    .join("");

  const recommendations = view.interpretation.recommendationLines

    .map((line) => `<li>${_escapeHtml(line)}</li>`)

    .join("");



  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>Тест на выгорание — ${_escapeHtml(view.personName)}</title></head><body>

<h1>Тест на выгорание (Маслач)</h1>

<p><strong>${_escapeHtml(view.personName)}</strong></p>

<p>Пройден: ${_escapeHtml(formatMoscowDateTime(view.createdAt))}</p>

<h2>${_escapeHtml(view.interpretation.verdictTitle)}</h2>

<p>${_escapeHtml(view.interpretation.verdictText)}</p>

<table border="1" cellpadding="6"><thead><tr><th>Шкала</th><th>Балл</th><th>Уровень</th></tr></thead><tbody>${rows}</tbody></table>

<h3>Рекомендации</h3><ul>${recommendations}</ul>

</body></html>`;

}



function _buildProfSbExportHtml(

  view: NonNullable<Awaited<ReturnType<typeof buildProfSbEducationReportView>>>

): string {

  const status =

    view.report?.status === "computed"

      ? "Интерпретация рассчитана"

      : "Ожидает методики / ключей подсчёта";

  const answersJson = _escapeHtml(JSON.stringify(view.answers, null, 2));



  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>ПРОФ СБ — ${_escapeHtml(view.personName)}</title></head><body>

<h1>ПРОФ СБ + ПРОФ образование</h1>

<p><strong>${_escapeHtml(view.personName)}</strong> · ${_escapeHtml(view.createdAt)}</p>

<p>${_escapeHtml(status)}</p>

<h2>Ответы</h2>

<pre>${answersJson}</pre>

</body></html>`;

}



function _escapeHtml(value: string): string {

  return value

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;");

}


