import {
  getAuditTestBlockSpecsForProfile,
  type AuditReportProfile,
} from "@/lib/audit/report/auditReportProfile";
import type { AuditReportJson } from "@/lib/audit/report/auditReportTypes";

function _internalKeysSignature(report: AuditReportJson): string {
  return (report.testBlocks ?? [])
    .flatMap((block) => block.internalKeys ?? [])
    .slice()
    .sort()
    .join("\0");
}

function _profileKeysSignature(profile: AuditReportProfile): string {
  return getAuditTestBlockSpecsForProfile(profile)
    .flatMap((spec) => spec.internalKeys)
    .slice()
    .sort()
    .join("\0");
}

/**
 * Восстанавливает профиль отчёта аудита по сохранённому JSON (или блокам методик).
 */
export function inferAuditReportProfileFromStored(
  report: AuditReportJson | null
): AuditReportProfile {
  if (report?.reportProfile !== undefined) {
    return report.reportProfile;
  }
  if (report === null) {
    return "full_state_audit";
  }

  const signature = _internalKeysSignature(report);
  const profiles: AuditReportProfile[] = [
    "od_reserve",
    "tu_management_chef",
    "candidate_screening",
    "full_state_audit",
  ];
  for (const profile of profiles) {
    if (signature === _profileKeysSignature(profile)) {
      return profile;
    }
  }

  const keys = new Set(
    (report.testBlocks ?? []).flatMap((block) => block.internalKeys ?? [])
  );
  if (keys.has("sectarianism_screening")) {
    if (keys.has("maslach_mbi_short") || keys.has("kos_communicative_organizational")) {
      return "od_reserve";
    }
    return "candidate_screening";
  }
  if (keys.has("maslach_mbi_short")) {
    return "od_reserve";
  }
  if (
    (report.narrativeSections ?? []).some((section) => section.title === "Анкета ПРОФ СБ")
  ) {
    return "tu_management_chef";
  }

  return "full_state_audit";
}
