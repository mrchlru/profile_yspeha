import { candidatePositionLevelLabel } from "@/lib/admin/candidatePositionLevels";
import { STEP4_FIELD_OPTIONS } from "@/lib/step4/step4Labels";
import type { Step4Data } from "@/lib/step4/step4Types";
import { prisma } from "@/lib/prisma";

export type AttestationBriefEmployeeMeta = {
  /** «бухгалтер финансового отдела» — без ФИО. */
  roleSubtitle: string;
  /** «для руководителя финансового отдела». */
  managerAudienceLine: string;
};

/**
 * Восстанавливает должность и адресата отчёта из приглашения и анкеты скрининга (step4).
 */
export async function resolveAttestationBriefEmployeeMeta(
  sessionId: string
): Promise<AttestationBriefEmployeeMeta> {
  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId },
    select: {
      candidateFolderKey: true,
      accessInviteCode: true,
    },
  });

  const step4 = await _loadLatestStep4ForFolder(row?.candidateFolderKey ?? null);
  const positionLevel = await _loadPositionLevelFromInvite(row?.accessInviteCode ?? null);

  return _buildMetaFromSources(step4, positionLevel);
}

async function _loadLatestStep4ForFolder(
  candidateFolderKey: string | null
): Promise<Step4Data | null> {
  if (!candidateFolderKey) {
    return null;
  }
  const screening = await prisma.screeningSubmission.findFirst({
    where: { candidateFolderKey },
    orderBy: { createdAt: "desc" },
    select: { step4Data: true },
  });
  if (!screening?.step4Data || typeof screening.step4Data !== "object") {
    return null;
  }
  return screening.step4Data as Step4Data;
}

async function _loadPositionLevelFromInvite(
  accessInviteCode: string | null
): Promise<string | null> {
  if (!accessInviteCode) {
    return null;
  }
  const invite = await prisma.accessInvite.findUnique({
    where: { code: accessInviteCode },
    select: { candidatePositionLevel: true },
  });
  return invite?.candidatePositionLevel ?? null;
}

function _buildMetaFromSources(
  step4: Step4Data | null,
  positionLevel: string | null
): AttestationBriefEmployeeMeta {
  const work = step4?.currentWork;
  const position = work?.position?.trim() ?? "";
  const organization = work?.organization?.trim() ?? "";
  const fieldValue = work?.field ?? "";
  const fieldLabel = _fieldLabel(fieldValue);

  let roleSubtitle = position;
  if (roleSubtitle.length === 0 && positionLevel) {
    roleSubtitle = candidatePositionLevelLabel(positionLevel).toLowerCase();
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

  const managerAudienceLine = _managerAudienceLine(organization, fieldLabel, positionLevel);

  return { roleSubtitle, managerAudienceLine };
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

function _managerAudienceLine(
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
