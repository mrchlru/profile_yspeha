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

export {
  documentReportSource,
  documentReportSourceCandidates,
} from "@/lib/admin/documentReportSource";
