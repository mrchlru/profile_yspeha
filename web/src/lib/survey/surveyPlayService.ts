import { Prisma } from "@/generated/prisma/client";
import { normalizeAccessCode } from "@/lib/access/accessCode";
import { checkAccessInvite } from "@/lib/access/findActiveInvite";
import { TEST_KIND_CUSTOM_SURVEY } from "@/lib/access/testKinds";
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

function _parseSchema(raw: unknown): SurveySchemaDocument {
  return raw as SurveySchemaDocument;
}

function _parseSettings(raw: unknown): SurveySettingsDocument {
  return raw as SurveySettingsDocument;
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
  const invite = await checkAccessInvite(rawCode);
  if (invite.status !== "ok") {
    return { ok: false, reason: "invalid_code" };
  }
  if (invite.testKind !== TEST_KIND_CUSTOM_SURVEY) {
    return { ok: false, reason: "wrong_kind" };
  }

  const code = normalizeAccessCode(rawCode);
  const row = await prisma.accessInvite.findFirst({
    where: { code },
    select: {
      surveyVersionId: true,
      surveyVersion: {
        select: {
          id: true,
          surveyId: true,
          schema: true,
          settings: true,
          survey: { select: { title: true, mode: true } },
        },
      },
    },
  });

  if (!row?.surveyVersionId || !row.surveyVersion) {
    return { ok: false, reason: "missing_version" };
  }

  let response = await prisma.surveyResponse.findFirst({
    where: { accessInviteCode: code, status: "in_progress" },
    select: { id: true },
  });

  if (!response) {
    response = await prisma.surveyResponse.create({
      data: {
        surveyId: row.surveyVersion.surveyId,
        surveyVersionId: row.surveyVersion.id,
        accessInviteCode: code,
        status: "in_progress",
        source: "custom",
      },
      select: { id: true },
    });
  }

  const schema = _parseSchema(row.surveyVersion.schema);
  return {
    ok: true,
    payload: {
      surveyId: row.surveyVersion.surveyId,
      surveyVersionId: row.surveyVersion.id,
      title: row.surveyVersion.survey.title,
      mode: row.surveyVersion.survey.mode,
      schema,
      settings: _parseSettings(row.surveyVersion.settings),
      responseId: response.id,
    },
  };
}

export type SubmitSurveyAnswersInput = {
  code: string;
  responseId: string;
  answers: Array<{ questionId: string; value: unknown }>;
};

/**
 * Сохраняет ответы и завершает прохождение.
 */
export async function submitSurveyPlay(input: SubmitSurveyAnswersInput): Promise<
  | { ok: true }
  | { ok: false; reason: "invalid_code" | "not_found" | "conflict" }
> {
  const invite = await checkAccessInvite(input.code);
  if (invite.status !== "ok" || invite.testKind !== TEST_KIND_CUSTOM_SURVEY) {
    return { ok: false, reason: "invalid_code" };
  }

  const response = await prisma.surveyResponse.findUnique({
    where: { id: input.responseId },
    select: { id: true, accessInviteCode: true, status: true },
  });
  if (!response || response.accessInviteCode !== normalizeAccessCode(input.code)) {
    return { ok: false, reason: "not_found" };
  }
  if (response.status !== "in_progress") {
    return { ok: false, reason: "conflict" };
  }

  const submittedAt = new Date();
  await prisma.$transaction([
    prisma.surveyAnswer.deleteMany({ where: { responseId: response.id } }),
    prisma.surveyAnswer.createMany({
      data: input.answers.map((a) => ({
        responseId: response.id,
        questionId: a.questionId,
        value: a.value as Prisma.InputJsonValue,
      })),
    }),
    prisma.surveyResponse.update({
      where: { id: response.id },
      data: { status: "submitted", submittedAt },
    }),
    prisma.accessInvite.updateMany({
      where: { code: normalizeAccessCode(input.code), usedAt: null },
      data: { usedAt: submittedAt },
    }),
  ]);

  return { ok: true };
}
