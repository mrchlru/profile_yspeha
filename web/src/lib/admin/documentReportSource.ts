import type { EmployeeDocumentSlotId } from "@/lib/admin/employeeFolderTypes";
import { parseEmployeeFolderKey } from "@/lib/admin/employeeFolderKey";
import type { FolderReportSource } from "@/lib/admin/folderReportSessions";

/**
 * Возможные источники данных для документа (в порядке предпочтения).
 * Короткий/полный отчёт в папке кандидата: сначала скрининг, иначе аудит (ОД/ТУ).
 */
export function documentReportSourceCandidates(
  documentId: EmployeeDocumentSlotId,
  folderKey: string
): FolderReportSource[] {
  const parsed = parseEmployeeFolderKey(folderKey);
  if (!parsed) {
    return [];
  }

  switch (documentId) {
    case "short_report":
    case "full_report":
      // Скрининг кандидата пишет auditSubmission (батарея с методиками); stub
      // screeningSubmission от sync не должен перекрывать полный отчёт.
      return parsed.kind === "candidate" ? ["audit", "screening"] : ["audit"];
    case "manager_report":
      return ["audit"];
    case "executive_manager_report":
      return parsed.kind === "candidate" ? ["audit", "screening"] : ["audit"];
    case "violations_report":
      return parsed.kind === "candidate" || parsed.kind === "audit" ? ["audit"] : [];
    case "dashboard":
      return ["audit"];
    default:
      return [];
  }
}

/**
 * Предпочтительный источник данных для типа документа в папке.
 */
export function documentReportSource(
  documentId: EmployeeDocumentSlotId,
  folderKey: string
): FolderReportSource | null {
  return documentReportSourceCandidates(documentId, folderKey)[0] ?? null;
}
