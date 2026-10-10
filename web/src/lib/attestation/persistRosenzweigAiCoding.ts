import { Prisma } from "@/generated/prisma/client";

import { buildRosenzweigCodingContext } from "@/lib/ai/buildRosenzweigCodingContext";
import { generateRosenzweigCoding } from "@/lib/ai/generateRosenzweigCoding";
import type { AttestationAnswers } from "@/lib/attestation/attestationQuestions";
import type { AttestationReportJson } from "@/lib/attestation/attestationReportTypes";
import {
  computeRosenzweigCodingSummary,
  countRosenzweigCodedEntries,
  type RosenzweigCodingMap,
} from "@/lib/attestation/rosenzweigCoding";
import { formatMoscowNow } from "@/lib/datetime/moscowTime";
import { screeningServerLog } from "@/lib/logging/screeningServerLog";
import { prisma } from "@/lib/prisma";

export type PersistRosenzweigAiCodingResult = {
  coding: RosenzweigCodingMap;
  codedCount: number;
  /** true — коды записаны моделью в этом вызове. */
  aiGenerated: boolean;
  /** true — пропуск: кодирование уже было и force=false. */
  skippedExisting: boolean;
};

/**
 * Генерирует ИИ-кодирование Розенцвейга и сохраняет в сессию аттестации.
 * Без force не перезаписывает уже заполненное кодирование.
 */
export async function persistRosenzweigAiCoding(input: {
  sessionId: string;
  sessionRef: string;
  personName: string;
  force?: boolean;
}): Promise<PersistRosenzweigAiCodingResult> {
  const force = input.force === true;
  const row = await prisma.attestationSubmission.findUnique({
    where: { sessionId: input.sessionId },
    select: {
      answers: true,
      rosenzweigCoding: true,
      attestationReport: true,
    },
  });

  if (!row?.answers || typeof row.answers !== "object") {
    return { coding: {}, codedCount: 0, aiGenerated: false, skippedExisting: false };
  }

  const existingCoding =
    row.rosenzweigCoding && typeof row.rosenzweigCoding === "object"
      ? (row.rosenzweigCoding as RosenzweigCodingMap)
      : {};
  const existingCount = countRosenzweigCodedEntries(existingCoding);

  if (!force && existingCount > 0) {
    screeningServerLog("attestation_rosenzweig_ai", "skipped_existing", {
      sessionRef: input.sessionRef,
      codedCount: existingCount,
    });
    return {
      coding: existingCoding,
      codedCount: existingCount,
      aiGenerated: false,
      skippedExisting: true,
    };
  }

  const answers = row.answers as AttestationAnswers;
  const rosenzweigContext = buildRosenzweigCodingContext({
    personName: input.personName,
    answers,
  });

  const aiResult = await generateRosenzweigCoding({
    rosenzweigContext,
    sessionRef: input.sessionRef,
  });

  if (!aiResult.ok || aiResult.codedCount === 0) {
    return {
      coding: existingCoding,
      codedCount: existingCount,
      aiGenerated: false,
      skippedExisting: false,
    };
  }

  const summary = computeRosenzweigCodingSummary(aiResult.coding);
  const generatedAt = formatMoscowNow();
  const prevReport =
    row.attestationReport && typeof row.attestationReport === "object"
      ? (row.attestationReport as unknown as AttestationReportJson)
      : null;

  const nextReport: AttestationReportJson | null = prevReport
    ? {
        ...prevReport,
        rosenzweigCodingSummary: summary,
        rosenzweigCodingMeta: {
          source: "ai",
          generatedAt,
        },
      }
    : null;

  await prisma.attestationSubmission.update({
    where: { sessionId: input.sessionId },
    data: {
      rosenzweigCoding: aiResult.coding as Prisma.InputJsonValue,
      ...(nextReport
        ? { attestationReport: nextReport as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });

  screeningServerLog("attestation_rosenzweig_ai", "persisted", {
    sessionRef: input.sessionRef,
    codedCount: aiResult.codedCount,
    force,
  });

  return {
    coding: aiResult.coding,
    codedCount: aiResult.codedCount,
    aiGenerated: true,
    skippedExisting: false,
  };
}
