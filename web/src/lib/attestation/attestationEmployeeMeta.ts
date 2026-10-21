import { candidatePositionLevelLabel } from "@/lib/admin/candidatePositionLevels";
import { STEP4_FIELD_OPTIONS } from "@/lib/step4/step4Labels";
import type { Step4Data } from "@/lib/step4/step4Types";

export type AttestationEmployeeMeta = {
  /** «бухгалтер финансового отдела» — без ФИО. */
  roleSubtitle: string;
  /** «для руководителя финансового отдела». */
  managerAudienceLine: string;
};

/**
 * Мета для отчётов из должности, которую сотрудник указал при старте аттестации.
 */
export function buildAttestationEmployeeMetaFromJobTitle(jobTitle: string): AttestationEmployeeMeta {
  const roleSubtitle = jobTitle.trim();
  return {
    roleSubtitle,
    managerAudienceLine: _managerAudienceLineFromJobTitle(roleSubtitle),
  };
}

/**
 * Запасной вариант для старых прохождений без поля должности.
 */
export function buildAttestationEmployeeMetaFallback(input: {
  step4: Step4Data | null;
  positionLevel: string | null;
}): AttestationEmployeeMeta {
  const work = input.step4?.currentWork;
  const position = work?.position?.trim() ?? "";
  const organization = work?.organization?.trim() ?? "";
  const fieldValue = work?.field ?? "";
  const fieldLabel = _fieldLabel(fieldValue);

  let roleSubtitle = position;
  if (roleSubtitle.length === 0 && input.positionLevel) {
    roleSubtitle = candidatePositionLevelLabel(input.positionLevel).toLowerCase();
  }
  if (roleSubtitle.length === 0) {
    roleSubtitle = "сотрудник";
  }

  if (
    position.length > 0 &&
    fieldValue === "finance" &&
    !_roleAlreadyMentionsField(roleSubtitle, fieldLabel)
  ) {
    roleSubtitle = `${position} финансового отдела`;
  } else if (
    position.length > 0 &&
    fieldLabel.length > 0 &&
    !_roleAlreadyMentionsField(roleSubtitle, fieldLabel)
  ) {
    roleSubtitle = `${position} · ${fieldLabel}`;
  } else if (position.length === 0 && fieldLabel.length > 0) {
    roleSubtitle = `${roleSubtitle} (${fieldLabel})`;
  }

  return {
    roleSubtitle,
    managerAudienceLine: _managerAudienceLineFallback(organization, fieldLabel, input.positionLevel),
  };
}

function _managerAudienceLineFromJobTitle(roleSubtitle: string): string {
  const lower = roleSubtitle.toLowerCase();
  const deptMatch = lower.match(/([а-яёa-z0-9\-]+(?:\s+[а-яёa-z0-9\-]+)*\s+отдела?)/u);
  if (deptMatch?.[1]) {
    return `для руководителя ${deptMatch[1]}`;
  }
  return "для непосредственного руководителя";
}

function _managerAudienceLineFallback(
  organization: string,
  fieldLabel: string,
  positionLevel: string | null
): string {
  if (fieldLabel.length > 0) {
    return `для руководителя ${fieldLabel}`;
  }
  if (organization.length > 0) {
    return `для руководителя · ${organization}`;
  }
  if (positionLevel) {
    return `для непосредственного руководителя (${candidatePositionLevelLabel(positionLevel).toLowerCase()})`;
  }
  return "для непосредственного руководителя";
}

function _fieldLabel(fieldValue: string): string {
  const option = STEP4_FIELD_OPTIONS.find((item) => item.value === fieldValue);
  if (!option) {
    return "";
  }
  if (fieldValue === "finance") {
    return "финансовый отдел";
  }
  return option.label.toLowerCase();
}

function _roleAlreadyMentionsField(role: string, fieldLabel: string): boolean {
  const haystack = role.toLowerCase();
  return haystack.includes(fieldLabel) || haystack.includes("финанс");
}
