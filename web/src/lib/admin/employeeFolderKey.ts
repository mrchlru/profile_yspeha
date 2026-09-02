import type { EmployeeDocumentSlotId } from "@/lib/admin/employeeFolderTypes";

export type EmployeeFolderKind = "candidate" | "audit";

export type ParsedEmployeeFolderKey =
  | { kind: "candidate"; folderKey: string }
  | { kind: "audit"; folderKey: string; assesseeKey: string };

const AUDIT_FOLDER_PREFIX = "audit:";
const CANDIDATE_FOLDER_PREFIX = "candidate:";

/**
 * Разбирает ключ папки сотрудника из админ-панели.
 */
export function parseEmployeeFolderKey(folderKey: string): ParsedEmployeeFolderKey | null {
  const trimmed = folderKey.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith(CANDIDATE_FOLDER_PREFIX)) {
    return { kind: "candidate", folderKey: trimmed };
  }

  if (trimmed.startsWith(AUDIT_FOLDER_PREFIX)) {
    const assesseeKey = trimmed.slice(AUDIT_FOLDER_PREFIX.length).trim();
    if (!assesseeKey) {
      return null;
    }
    return { kind: "audit", folderKey: trimmed, assesseeKey };
  }

  return null;
}

/**
 * Определяет источник данных для типа документа в папке.
 */
export function documentReportSource(
  documentId: EmployeeDocumentSlotId,
  folderKey: string
): "screening" | "audit" | null {
  const parsed = parseEmployeeFolderKey(folderKey);
  if (!parsed) {
    return null;
  }

  switch (documentId) {
    case "short_report":
    case "full_report":
      return parsed.kind === "candidate" ? "screening" : "audit";
    case "manager_report":
      return parsed.kind === "audit" ? "audit" : null;
    case "violations_report":
      return parsed.kind === "candidate" || parsed.kind === "audit" ? "audit" : null;
    case "dashboard":
      return "audit";
    default:
      return null;
  }
}
