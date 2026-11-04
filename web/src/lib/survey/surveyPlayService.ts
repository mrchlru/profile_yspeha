import { Prisma } from "@/generated/prisma/client";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { isTestKind, TEST_KIND_CUSTOM_SURVEY } from "@/lib/access/testKinds";
import { prisma } from "@/lib/prisma";
import type {
  SurveySchemaDocument,
  SurveySettingsDocument,
} from "@/lib/survey/surveyTypes";

export type SurveyPlayPayload = {
  surveyId: string;
  surveyVersionId: string;
  title: string;
  mode: string;
  schema: SurveySchemaDocument;
  settings: SurveySettingsDocument;
  responseId: string;
};

export type SurveyPublicPreviewPayload = {
  surveyId: string;
  title: string;
  schema: SurveySchemaDocument;
  settings: SurveySettingsDocument;
};

function _parseSchema(raw: unknown): SurveySchemaDocument {
  return raw as SurveySchemaDocument;
}

function _parseSettings(raw: unknown): SurveySettingsDocument {
  const settings = raw as SurveySettingsDocument;
  return {
    ...settings,
    publicLinkEnabled: settings.publicLinkEnabled === true,
    publicLinkToken: settings.publicLinkToken ?? null,
    allowMultipleResponses: settings.allowMultipleResponses === true,
  };
}

type CustomInviteRow = {
  code: string;
  testKind: string;
  revokedAt: Date | null;
  expiresAt: Date;
  usedAt: Date | null;
  surveyVersion: {
    id: string;
    surveyId: string;
    schema: unknown;
    settings: unknown;
    survey: { title: string; mode: string; status: string };
  } | null;
};

/**
 * Проверяет код приглашения на собственный опрос с учётом повторного прохождения.
 */
async function _loadCustomSurveyInvite(
  rawCode: string
): Promise<
  | { ok: true; row: CustomInviteRow }
  | { ok: false; reason: "invalid_code" | "wrong_kind" | "missing_version" }
> {
  const code = normalizeAccessCode(rawCode);
  if (code.length < 8) {
    return { ok: false, reason: "invalid_code" };
  }

  const row = await prisma.accessInvite.findFirst({
    where: { code },
    select: {
      code: true,
      testKind: true,
      revokedAt: true,
      expiresAt: true,
      usedAt: true,
      surveyVersion: {
        select: {
          id: true,
          surveyId: true,
          schema: true,
          settings: true,
          survey: { select: { title: true, mode: true, status: true } },
        },
      },
    },
  });

  if (!row || row.revokedAt !== null) {
    return { ok: false, reason: "invalid_code" };
  }
  if (!isTestKind(row.testKind) || row.testKind !== TEST_KIND_CUSTOM_SURVEY) {
    return { ok: false, reason: "wrong_kind" };
  }
  if (!row.surveyVersion) {
    return { ok: false, reason: "missing_version" };
  }
  if (row.surveyVersion.survey.status !== "published") {
    return { ok: false, reason: "invalid_code" };
  }

  const settings = _parseSettings(row.surveyVersion.settings);
  const expired = row.expiresAt.getTime() <= Date.now();
  const used = row.usedAt !== null;

  if (expired) {
    return { ok: false, reason: "invalid_code" };
  }
  if (used && !settings.allowMultipleResponses) {
    return { ok: false, reason: "invalid_code" };
  }

  return { ok: true, row: row as CustomInviteRow };
}

function _payloadFromVersion(
  version: NonNullable<CustomInviteRow["surveyVersion"]>,
  responseId: string
): SurveyPlayPayload {
  return {
    surveyId: version.surveyId,
    surveyVersionId: version.id,
    title: version.survey.title,
    mode: version.survey.mode,
    schema: _parseSchema(version.schema),
    settings: _parseSettings(version.settings),
    responseId,
  };
}

/**
 * Загружает опубликованную версию и создаёт/возобновляет прохождение по коду доступа.
 */
export async function loadSurveyPlayByAccessCode(
  rawCode: string
): Promise<
  | { ok: true; payload: SurveyPlayPayload }
  | { ok: false; reason: "invalid_code" | "wrong_kind" | "missing_version" }
> {
  const invite = await _loadCustomSurveyInvite(rawCode);
  if (!invite.ok) {
    return invite;
  }

  const code = invite.row.code;
  const version = invite.row.surveyVersion!;
  const settings = _parseSettings(version.settings);

  let response = await prisma.surveyResponse.findFirst({
    where: { accessInviteCode: code, status: "in_progress" },
    select: { id: true },
  });

  if (!response) {
    if (!settings.allowMultipleResponses) {
      const submitted = await prisma.surveyResponse.findFirst({
        where: { accessInviteCode: code, status: "submitted" },
        select: { id: true },
      });
      if (submitted) {
        return { ok: false, reason: "invalid_code" };
      }
    }

    response = await prisma.surveyResponse.create({
      data: {
        surveyId: version.surveyId,
        surveyVersionId: version.id,
        accessInviteCode: code,
        status: "in_progress",
        source: "custom",
      },
      select: { id: true },
    });
  }

  return { ok: true, payload: _payloadFromVersion(version, response.id) };
}

export type SubmitSurveyAnswersInput = {
  code: string;
  responseId: string;
  answers: Array<{ questionId: string; value: unknown }>;
};

async function _finalizeSurveyResponse(
  responseId: string,
  answers: Array<{ questionId: string; value: unknown }>,
  markInviteUsed: boolean,
  inviteCode: string | null
): Promise<void> {
  const submittedAt = new Date();
  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.surveyAnswer.deleteMany({ where: { responseId } }),
    prisma.surveyAnswer.createMany({
      data: answers.map((a) => ({
        responseId,
        questionId: a.questionId,
        value: a.value as Prisma.InputJsonValue,
      })),
    }),
    prisma.surveyResponse.update({
      where: { id: responseId },
      data: { status: "submitted", submittedAt },
    }),
  ];

  if (markInviteUsed && inviteCode) {
    ops.push(
      prisma.accessInvite.updateMany({
        where: { code: inviteCode, usedAt: null },
        data: { usedAt: submittedAt },
      })
    );
  }

  await prisma.$transaction(ops);
}

/**
 * Сохраняет ответы и завершает прохождение по коду доступа.
 */
export async function submitSurveyPlay(input: SubmitSurveyAnswersInput): Promise<
  | { ok: true }
  | { ok: false; reason: "invalid_code" | "not_found" | "conflict" }
> {
  const invite = await _loadCustomSurveyInvite(input.code);
  if (!invite.ok) {
    return { ok: false, reason: "invalid_code" };
  }

  const code = invite.row.code;
  const settings = _parseSettings(invite.row.surveyVersion!.settings);

  const response = await prisma.surveyResponse.findUnique({
    where: { id: input.responseId },
    select: { id: true, accessInviteCode: true, status: true },
  });
  if (!response || response.accessInviteCode !== code) {
    return { ok: false, reason: "not_found" };
  }
  if (response.status !== "in_progress") {
    return { ok: false, reason: "conflict" };
  }

  await _finalizeSurveyResponse(
    response.id,
    input.answers,
    !settings.allowMultipleResponses,
    code
  );

  return { ok: true };
}

/**
 * Находит опубликованный опрос по токену общей ссылки.
 */
export async function findPublishedSurveyByPublicToken(
  rawToken: string
): Promise<
  | {
      surveyId: string;
      surveyVersionId: string;
      title: string;
      mode: string;
      schema: SurveySchemaDocument;
      settings: SurveySettingsDocument;
    }
  | null
> {
  const token = rawToken.trim();
  if (token.length < 16) {
    return null;
  }

  const rows = await prisma.survey.findMany({
    where: { status: "published", currentVersionId: { not: null } },
    select: {
      id: true,
      currentVersionId: true,
      currentVersion: {
        select: { id: true, schema: true, settings: true, survey: { select: { title: true, mode: true } } },
      },
    },
  });

  for (const row of rows) {
    if (!row.currentVersion) {
      continue;
    }
    const settings = _parseSettings(row.currentVersion.settings);
    if (!settings.publicLinkEnabled || settings.publicLinkToken !== token) {
      continue;
    }
    return {
      surveyId: row.id,
      surveyVersionId: row.currentVersion.id,
      title: row.currentVersion.survey.title,
      mode: row.currentVersion.survey.mode,
      schema: _parseSchema(row.currentVersion.schema),
      settings,
    };
  }

  return null;
}

/**
 * Данные для экрана приветствия по общей ссылке (без создания ответа).
 */
export async function loadSurveyPublicPreview(
  rawToken: string
): Promise<
  | { ok: true; payload: SurveyPublicPreviewPayload }
  | { ok: false; reason: "not_found" }
> {
  const found = await findPublishedSurveyByPublicToken(rawToken);
  if (!found) {
    return { ok: false, reason: "not_found" };
  }
  return {
    ok: true,
    payload: {
      surveyId: found.surveyId,
      title: found.title,
      schema: found.schema,
      settings: found.settings,
    },
  };
}

/**
 * Начинает новое прохождение по общей ссылке.
 */
export async function startSurveyPlayByPublicToken(
  rawToken: string
): Promise<
  | { ok: true; payload: SurveyPlayPayload }
  | { ok: false; reason: "not_found" }
> {
  const found = await findPublishedSurveyByPublicToken(rawToken);
  if (!found) {
    return { ok: false, reason: "not_found" };
  }

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: found.surveyId,
      surveyVersionId: found.surveyVersionId,
      accessInviteCode: null,
      status: "in_progress",
      source: "public_link",
    },
    select: { id: true },
  });

  return {
    ok: true,
    payload: {
      surveyId: found.surveyId,
      surveyVersionId: found.surveyVersionId,
      title: found.title,
      mode: found.mode,
      schema: found.schema,
      settings: found.settings,
      responseId: response.id,
    },
  };
}

export type SubmitSurveyPublicInput = {
  token: string;
  responseId: string;
  answers: Array<{ questionId: string; value: unknown }>;
};

/**
 * Завершает прохождение по общей ссылке.
 */
export async function submitSurveyPublicPlay(
  input: SubmitSurveyPublicInput
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_found" | "conflict" }
> {
  const found = await findPublishedSurveyByPublicToken(input.token);
  if (!found) {
    return { ok: false, reason: "not_found" };
  }

  const response = await prisma.surveyResponse.findUnique({
    where: { id: input.responseId },
    select: { id: true, surveyId: true, status: true, source: true },
  });
  if (!response || response.surveyId !== found.surveyId) {
    return { ok: false, reason: "not_found" };
  }
  if (response.status !== "in_progress") {
    return { ok: false, reason: "conflict" };
  }

  await _finalizeSurveyResponse(response.id, input.answers, false, null);
  return { ok: true };
}
