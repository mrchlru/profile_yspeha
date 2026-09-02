/**
 * Разовое восстановление `used_at` у приглашений, по которым тест уже сдан,
 * но код остался «Активен» (баг: audit_middle / audit_senior не вызывали markAccessCodeUsed).
 *
 * Запуск (прод, из каталога web):
 *   npx tsx scripts/backfillAccessInviteUsedAt.ts
 *   npx tsx scripts/backfillAccessInviteUsedAt.ts --dry-run
 *
 * На Railway Shell (рекомендуется):
 *   npx tsx scripts/backfillAccessInviteUsedAt.ts
 */
import { normalizeAccessCode } from "../src/lib/access/accessCode";
import { buildAuditAssesseeKey } from "../src/lib/audit/auditAssesseeKey";
import {
  isTestKind,
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_BURNOUT,
  TEST_KIND_PROF_SB_EDUCATION,
  TEST_KIND_SCREENING,
  TEST_KIND_STATE_AUDIT,
  type TestKind,
} from "../src/lib/access/testKinds";
import { prisma } from "../src/lib/prisma";

type InviteRow = {
  id: string;
  code: string;
  testKind: string;
  createdAt: Date;
  expiresAt: Date;
  candidateFirstName: string | null;
  candidateLastName: string | null;
};

type MatchResult = {
  usedAt: Date;
  source: string;
  sessionId: string;
};

const dryRun = process.argv.includes("--dry-run");

/** Уже привязанные к другим приглашениям сессии (не дублировать одну сдачу). */
const claimedSessionKeys = new Set<string>();

function _sessionClaimKey(source: string, sessionId: string): string {
  return `${source}:${sessionId}`;
}

function _claim(source: string, sessionId: string): boolean {
  const key = _sessionClaimKey(source, sessionId);
  if (claimedSessionKeys.has(key)) {
    return false;
  }
  claimedSessionKeys.add(key);
  return true;
}

async function _matchByAccessInviteCode(
  invite: InviteRow,
  normalizedCode: string
): Promise<MatchResult | null> {
  const createdAfterInvite = { gte: invite.createdAt };

  const screening = await prisma.screeningSubmission.findFirst({
    where: { accessInviteCode: normalizedCode, createdAt: createdAfterInvite },
    orderBy: { createdAt: "asc" },
    select: { sessionId: true, createdAt: true },
  });
  if (screening !== null && _claim("screening", screening.sessionId)) {
    return {
      usedAt: screening.createdAt,
      source: "screening_submission.code",
      sessionId: screening.sessionId,
    };
  }

  const burnout = await prisma.burnoutSubmission.findFirst({
    where: { accessInviteCode: normalizedCode, createdAt: createdAfterInvite },
    orderBy: { createdAt: "asc" },
    select: { sessionId: true, createdAt: true },
  });
  if (burnout !== null && _claim("burnout", burnout.sessionId)) {
    return {
      usedAt: burnout.createdAt,
      source: "burnout_submission.code",
      sessionId: burnout.sessionId,
    };
  }

  const profSb = await prisma.profSbEducationSubmission.findFirst({
    where: { accessInviteCode: normalizedCode, createdAt: createdAfterInvite },
    orderBy: { createdAt: "asc" },
    select: { sessionId: true, createdAt: true },
  });
  if (profSb !== null && _claim("prof_sb_education", profSb.sessionId)) {
    return {
      usedAt: profSb.createdAt,
      source: "prof_sb_education_submission.code",
      sessionId: profSb.sessionId,
    };
  }

  return null;
}

async function _matchByAssesseeKey(
  invite: InviteRow,
  assesseeKey: string
): Promise<MatchResult | null> {
  const createdAfterInvite = { gte: invite.createdAt };

  const auditRows = await prisma.auditSubmission.findMany({
    where: {
      assesseeKey,
      createdAt: createdAfterInvite,
    },
    orderBy: { createdAt: "asc" },
    select: { sessionId: true, createdAt: true },
  });
  for (const row of auditRows) {
    if (_claim("audit", row.sessionId)) {
      return {
        usedAt: row.createdAt,
        source: "audit_submission.assessee",
        sessionId: row.sessionId,
      };
    }
  }

  const burnoutRows = await prisma.burnoutSubmission.findMany({
    where: {
      assesseeKey,
      createdAt: createdAfterInvite,
    },
    orderBy: { createdAt: "asc" },
    select: { sessionId: true, createdAt: true },
  });
  for (const row of burnoutRows) {
    if (_claim("burnout", row.sessionId)) {
      return {
        usedAt: row.createdAt,
        source: "burnout_submission.assessee",
        sessionId: row.sessionId,
      };
    }
  }

  const profRows = await prisma.profSbEducationSubmission.findMany({
    where: {
      assesseeKey,
      createdAt: createdAfterInvite,
    },
    orderBy: { createdAt: "asc" },
    select: { sessionId: true, createdAt: true },
  });
  for (const row of profRows) {
    if (_claim("prof_sb_education", row.sessionId)) {
      return {
        usedAt: row.createdAt,
        source: "prof_sb_education_submission.assessee",
        sessionId: row.sessionId,
      };
    }
  }

  return null;
}

async function _resolveUsedAtForInvite(invite: InviteRow): Promise<MatchResult | null> {
  if (!isTestKind(invite.testKind)) {
    return null;
  }

  const normalizedCode = normalizeAccessCode(invite.code);
  const byCode = await _matchByAccessInviteCode(invite, normalizedCode);
  if (byCode !== null) {
    return byCode;
  }

  const testKind = invite.testKind as TestKind;
  const needsAssessee =
    testKind === TEST_KIND_SCREENING ||
    testKind === TEST_KIND_BURNOUT ||
    testKind === TEST_KIND_PROF_SB_EDUCATION ||
    testKind === TEST_KIND_AUDIT_MIDDLE ||
    testKind === TEST_KIND_AUDIT_SENIOR ||
    testKind === TEST_KIND_STATE_AUDIT;

  if (!needsAssessee) {
    return null;
  }

  if (!invite.candidateFirstName?.trim() || !invite.candidateLastName?.trim()) {
    return null;
  }

  const assessee = buildAuditAssesseeKey({
    firstName: invite.candidateFirstName,
    lastName: invite.candidateLastName,
  });
  if (assessee === null) {
    return null;
  }

  return _matchByAssesseeKey(invite, assessee.key);
}

async function main(): Promise<void> {
  console.log(
    dryRun
      ? "Режим dry-run: в БД ничего не пишем."
      : "Режим записи: used_at будет обновлён."
  );

  const invites = await prisma.accessInvite.findMany({
    where: {
      usedAt: null,
      revokedAt: null,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      code: true,
      testKind: true,
      createdAt: true,
      expiresAt: true,
      candidateFirstName: true,
      candidateLastName: true,
    },
  });

  let updated = 0;
  let skippedNoMatch = 0;
  let skippedNoNames = 0;

  for (const invite of invites) {
    if (!isTestKind(invite.testKind)) {
      continue;
    }

    const match = await _resolveUsedAtForInvite(invite);
    if (match === null) {
      if (!invite.candidateFirstName?.trim() || !invite.candidateLastName?.trim()) {
        skippedNoNames += 1;
      } else {
        skippedNoMatch += 1;
      }
      continue;
    }

    const label = [
      invite.candidateLastName,
      invite.candidateFirstName,
    ]
      .filter(Boolean)
      .join(" ");

    console.log(
      `${dryRun ? "[dry-run] " : ""}${invite.code} ${invite.testKind}` +
        (label ? ` (${label})` : "") +
        ` → usedAt=${match.usedAt.toISOString()} via ${match.source} session=${match.sessionId}`
    );

    if (!dryRun) {
      await prisma.accessInvite.update({
        where: { id: invite.id },
        data: { usedAt: match.usedAt },
      });
    }
    updated += 1;
  }

  console.log("—");
  console.log(`Приглашений без used_at (не отозваны): ${String(invites.length)}`);
  console.log(`${dryRun ? "Будет обновлено" : "Обновлено"}: ${String(updated)}`);
  console.log(`Без совпадения (сдача не найдена): ${String(skippedNoMatch)}`);
  console.log(`Без ФИО в приглашении (только код): ${String(skippedNoNames)}`);

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
