import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { countSurveyQuestions } from "@/lib/survey/countSurveyQuestions";
import {
  createDefaultSurveySchema,
  createDefaultSurveySettings,
} from "@/lib/survey/createDefaultSurveyDraft";
import type {
  SurveyDraftPayload,
  SurveyListItem,
  SurveyMode,
  SurveySchemaDocument,
  SurveySettingsDocument,
  SurveyStatus,
} from "@/lib/survey/surveyTypes";
import { generateSurveyPublicLinkToken } from "@/lib/survey/surveyPublicLinkToken";
import {
  validateSurveyDraft,
  type SurveyDraftValidationIssue,
} from "@/lib/survey/validateSurveyDraft";

export type ListSurveysFilter = {
  status?: SurveyStatus | "all";
  mode?: SurveyMode | "all";
  search?: string;
};

function _parseSchema(raw: unknown): SurveySchemaDocument {
  return raw as SurveySchemaDocument;
}

function _parseSettings(raw: unknown): SurveySettingsDocument {
  const defaults = createDefaultSurveySettings();
  const parsed = raw as Partial<SurveySettingsDocument>;
  return {
    ...defaults,
    ...parsed,
    publicLinkEnabled: parsed.publicLinkEnabled === true,
    publicLinkToken: parsed.publicLinkToken ?? null,
    allowMultipleResponses: parsed.allowMultipleResponses === true,
  };
}

/**
 * Список опросов для админки с агрегатами.
 */
export async function listSurveysAdmin(filter: ListSurveysFilter): Promise<SurveyListItem[]> {
  const where: Prisma.SurveyWhereInput = {};
  if (filter.status && filter.status !== "all") {
    where.status = filter.status;
  }
  if (filter.mode && filter.mode !== "all") {
    where.mode = filter.mode;
  }
  if (filter.search?.trim()) {
    where.title = { contains: filter.search.trim(), mode: "insensitive" };
  }

  const rows = await prisma.survey.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      draftVersion: { select: { schema: true, settings: true } },
      currentVersion: { select: { schema: true, settings: true, versionNumber: true } },
      _count: { select: { responses: true } },
    },
  });

  return rows.map((row) => {
    const schemaSource = row.draftVersion?.schema ?? row.currentVersion?.schema ?? {};
    const settingsSource = row.draftVersion?.settings ?? row.currentVersion?.settings ?? {};
    const schema = _parseSchema(schemaSource);
    const settings = _parseSettings(settingsSource);
    const versionNumber = row.currentVersion?.versionNumber ?? null;
    const versionLabel =
      versionNumber !== null ? `Версия ${String(versionNumber)}` : "Не опубликован";
    return {
      id: row.id,
      title: row.title,
      mode: row.mode as SurveyMode,
      status: row.status as SurveyStatus,
      questionCount: countSurveyQuestions(schema),
      responseCount: row._count.responses,
      pendingReviewCount: 0,
      versionLabel,
      anonymous: settings.anonymous,
      updatedAt: row.updatedAt.toISOString(),
      createdByEmail: row.createdByEmail,
      currentVersionNumber: versionNumber,
    };
  });
}

/**
 * Создаёт опрос с пустым черновиком.
 */
export async function createSurveyAdmin(input: {
  mode: SurveyMode;
  title?: string;
  createdByEmail: string | null;
}): Promise<{ surveyId: string }> {
  const schema = createDefaultSurveySchema(input.mode, input.title);
  const settings = createDefaultSurveySettings();
  if (input.mode === "survey") {
    settings.showResultToRespondent = "none";
  }

  const survey = await prisma.survey.create({
    data: {
      title: schema.title,
      mode: input.mode,
      status: "draft",
      createdByEmail: input.createdByEmail,
      versions: {
        create: {
          versionNumber: null,
          schema: schema as unknown as Prisma.InputJsonValue,
          settings: settings as unknown as Prisma.InputJsonValue,
          revision: 1,
        },
      },
    },
    include: { versions: true },
  });

  const draftVersion = survey.versions[0];
  if (!draftVersion) {
    throw new Error("draft_version_missing");
  }

  await prisma.survey.update({
    where: { id: survey.id },
    data: { draftVersionId: draftVersion.id },
  });

  return { surveyId: survey.id };
}

/**
 * Возвращает черновик для редактора.
 */
export async function getSurveyDraftAdmin(surveyId: string): Promise<SurveyDraftPayload | null> {
  const row = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      draftVersion: true,
      currentVersion: { select: { versionNumber: true } },
      _count: { select: { responses: true } },
    },
  });
  if (!row?.draftVersion) {
    return null;
  }
  return {
    surveyId: row.id,
    revision: row.draftVersion.revision,
    schema: _parseSchema(row.draftVersion.schema),
    settings: _parseSettings(row.draftVersion.settings),
    status: row.status as SurveyStatus,
    mode: row.mode as SurveyMode,
    currentVersionNumber: row.currentVersion?.versionNumber ?? null,
    responseCount: row._count.responses,
  };
}

export type UpdateSurveyDraftResult =
  | { ok: true; revision: number }
  | { ok: false; reason: "not_found" | "conflict" | "archived" };

/**
 * Сохраняет черновик с проверкой revision (If-Match).
 */
export async function updateSurveyDraftAdmin(
  surveyId: string,
  input: {
    schema: SurveySchemaDocument;
    settings: SurveySettingsDocument;
    revision: number;
  }
): Promise<UpdateSurveyDraftResult> {
  const row = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { draftVersion: true },
  });
  if (!row?.draftVersion) {
    return { ok: false, reason: "not_found" };
  }
  if (row.status === "archived") {
    return { ok: false, reason: "archived" };
  }
  if (row.draftVersion.revision !== input.revision) {
    return { ok: false, reason: "conflict" };
  }

  const title = input.schema.title.trim() || "Без названия";
  await prisma.$transaction([
    prisma.surveyVersion.update({
      where: { id: row.draftVersion.id },
      data: {
        schema: input.schema as unknown as Prisma.InputJsonValue,
        settings: input.settings as unknown as Prisma.InputJsonValue,
        revision: { increment: 1 },
      },
    }),
    prisma.survey.update({
      where: { id: surveyId },
      data: { title, mode: row.mode, updatedAt: new Date() },
    }),
  ]);

  const updated = await prisma.surveyVersion.findUnique({
    where: { id: row.draftVersion.id },
    select: { revision: true },
  });
  return { ok: true, revision: updated?.revision ?? input.revision + 1 };
}

/**
 * Дублирует опрос (черновик копируется из текущего черновика или опубликованной версии).
 */
export async function duplicateSurveyAdmin(
  surveyId: string,
  createdByEmail: string | null
): Promise<{ surveyId: string } | null> {
  const source = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { draftVersion: true, currentVersion: true },
  });
  if (!source) {
    return null;
  }
  const schemaRaw = source.draftVersion?.schema ?? source.currentVersion?.schema;
  const settingsRaw = source.draftVersion?.settings ?? source.currentVersion?.settings;
  if (!schemaRaw || !settingsRaw) {
    return null;
  }
  const schema = _parseSchema(schemaRaw);
  schema.title = `${schema.title} (копия)`;

  return createSurveyAdmin({
    mode: source.mode as SurveyMode,
    title: schema.title,
    createdByEmail,
  }).then(async (created) => {
    const draft = await getSurveyDraftAdmin(created.surveyId);
    if (!draft) {
      return created;
    }
    await updateSurveyDraftAdmin(created.surveyId, {
      schema,
      settings: _parseSettings(settingsRaw),
      revision: draft.revision,
    });
    return created;
  });
}

/**
 * Переводит опрос в архив.
 */
export async function archiveSurveyAdmin(surveyId: string): Promise<boolean> {
  const result = await prisma.survey.updateMany({
    where: { id: surveyId, status: { not: "archived" } },
    data: { status: "archived" },
  });
  return result.count > 0;
}

/**
 * Восстанавливает опрос из архива в опубликованный или черновик.
 */
export async function restoreSurveyAdmin(surveyId: string): Promise<boolean> {
  const row = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { currentVersionId: true },
  });
  if (!row) {
    return false;
  }
  const nextStatus: SurveyStatus = row.currentVersionId ? "published" : "draft";
  const result = await prisma.survey.updateMany({
    where: { id: surveyId, status: "archived" },
    data: { status: nextStatus },
  });
  return result.count > 0;
}

/**
 * Удаляет опрос только без ответов.
 */
export type PublishSurveyResult =
  | { ok: true; versionNumber: number }
  | { ok: false; reason: "not_found" | "archived" | "invalid"; issues?: SurveyDraftValidationIssue[] };

/**
 * Публикует черновик как новую immutable-версию.
 */
export async function publishSurveyAdmin(
  surveyId: string,
  publishedByEmail: string | null
): Promise<PublishSurveyResult> {
  const row = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { draftVersion: true, currentVersion: true },
  });
  if (!row?.draftVersion) {
    return { ok: false, reason: "not_found" };
  }
  if (row.status === "archived") {
    return { ok: false, reason: "archived" };
  }

  const schema = _parseSchema(row.draftVersion.schema);
  let settings = _parseSettings(row.draftVersion.settings);
  if (row.currentVersion) {
    const publishedSettings = _parseSettings(row.currentVersion.settings);
    if (
      settings.publicLinkEnabled &&
      publishedSettings.publicLinkToken?.trim() &&
      !settings.publicLinkToken?.trim()
    ) {
      settings = {
        ...settings,
        publicLinkToken: publishedSettings.publicLinkToken,
      };
    }
  }
  if (settings.publicLinkEnabled && !settings.publicLinkToken?.trim()) {
    settings = { ...settings, publicLinkToken: generateSurveyPublicLinkToken() };
  }
  const validation = validateSurveyDraft({
    mode: row.mode as SurveyMode,
    schema,
    settings,
  });
  if (!validation.ok) {
    return { ok: false, reason: "invalid", issues: validation.issues };
  }

  const maxPublished = await prisma.surveyVersion.aggregate({
    where: { surveyId, versionNumber: { not: null } },
    _max: { versionNumber: true },
  });
  const nextVersionNumber = (maxPublished._max.versionNumber ?? 0) + 1;
  const publishedAt = new Date();

  const publishedVersion = await prisma.$transaction(async (tx) => {
    const version = await tx.surveyVersion.create({
      data: {
        surveyId,
        versionNumber: nextVersionNumber,
        schema: schema as unknown as Prisma.InputJsonValue,
        settings: settings as unknown as Prisma.InputJsonValue,
        revision: row.draftVersion!.revision,
        publishedAt,
        publishedByEmail,
      },
    });
    await tx.survey.update({
      where: { id: surveyId },
      data: {
        status: "published",
        currentVersionId: version.id,
        title: schema.title.trim() || row.title,
        updatedAt: publishedAt,
      },
    });
    await tx.surveyVersion.update({
      where: { id: row.draftVersion!.id },
      data: { settings: settings as unknown as Prisma.InputJsonValue },
    });
    return version;
  });

  void publishedVersion;
  return { ok: true, versionNumber: nextVersionNumber };
}

/**
 * Опубликованные опросы для выдачи приглашений.
 */
export async function listPublishedSurveysForAssign(): Promise<
  Array<{
    id: string;
    title: string;
    mode: SurveyMode;
    versionNumber: number;
    surveyVersionId: string;
    questionCount: number;
  }>
> {
  const rows = await prisma.survey.findMany({
    where: { status: "published", currentVersionId: { not: null } },
    orderBy: { title: "asc" },
    include: { currentVersion: true },
  });
  return rows
    .filter((row) => row.currentVersion)
    .map((row) => {
      const schema = _parseSchema(row.currentVersion!.schema);
      return {
        id: row.id,
        title: row.title,
        mode: row.mode as SurveyMode,
        versionNumber: row.currentVersion!.versionNumber ?? 1,
        surveyVersionId: row.currentVersion!.id,
        questionCount: countSurveyQuestions(schema),
      };
    });
}

/**
 * Полностью удаляет опрос/тест, ответы и отзывает связанные приглашения.
 */
export async function deleteSurveyAdmin(
  surveyId: string
): Promise<"deleted" | "not_found"> {
  const row = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { id: true },
  });
  if (!row) {
    return "not_found";
  }
  await prisma.$transaction(async (tx) => {
    await tx.accessInvite.updateMany({
      where: { surveyVersion: { surveyId } },
      data: { revokedAt: new Date() },
    });
    await tx.survey.delete({ where: { id: surveyId } });
  });
  return "deleted";
}
