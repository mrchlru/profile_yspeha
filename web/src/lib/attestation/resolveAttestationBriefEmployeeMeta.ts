import {
  buildAttestationEmployeeMetaFallback,
  buildAttestationEmployeeMetaFromJobTitle,
  type AttestationEmployeeMeta,
} from "@/lib/attestation/attestationEmployeeMeta";
import type { Step4Data } from "@/lib/step4/step4Types";
import { prisma } from "@/lib/prisma";

export type AttestationBriefEmployeeMeta = AttestationEmployeeMeta;

/**
 * Должность для краткого отчёта: сначала из аттестации, иначе запасной вариант (step4).
 */
export async function resolveAttestationBriefEmployeeMeta(
  sessionId: string
): Promise<AttestationBriefEmployeeMeta> {
  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId },
    select: {
      jobTitle: true,
      candidateFolderKey: true,
      accessInviteCode: true,
    },
  });

  const jobTitle = row?.jobTitle?.trim() ?? "";
  if (jobTitle.length >= 2) {
    return buildAttestationEmployeeMetaFromJobTitle(jobTitle);
  }

  const step4 = await _loadLatestStep4ForFolder(row?.candidateFolderKey ?? null);
  const positionLevel = await _loadPositionLevelFromInvite(row?.accessInviteCode ?? null);

  return buildAttestationEmployeeMetaFallback({ step4, positionLevel });
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
