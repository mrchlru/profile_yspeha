import type { AuditStepAnswers } from "@/lib/audit/auditAnswers";
import { getStepAnsweredCount } from "@/lib/audit/auditAnswers";
import { AUDIT_STEP_26_QUESTION_COUNT } from "@/lib/audit/questions/step26Sectarianism";
import type { AuditReportNarrativeParagraph } from "@/lib/audit/report/auditNarrativeParagraph";
import {
  narrativeInlineResult,
  narrativePlain,
} from "@/lib/audit/report/auditNarrativeParagraph";
import {
  SECTARIANISM_CLEAR_CONCLUSION,
  SECTARIANISM_DETECTION_THRESHOLD_PERCENT,
  SECTARIANISM_PROFILE_KEYS,
  type SectarianismProfileId,
} from "@/lib/audit/report/keys/sectarianismScoringKey";
import {
  formatSectarianismProfileForHr,
  getSectarianismProfileDescription,
} from "@/lib/audit/report/sectarianismProfiles";

/** Порядок и краткие подписи секций в сводной таблице HR-отчёта. */
const HR_SUMMARY_PROFILE_ORDER: ReadonlyArray<{
  id: SectarianismProfileId;
  summaryLabel: string;
}> = [
  { id: "jehovah_witnesses", summaryLabel: "Свидетели Иеговы" },
  { id: "herbalife", summaryLabel: "Гербалайф" },
  { id: "scientology", summaryLabel: "Саентология" },
  { id: "deir", summaryLabel: "ДЭИР" },
  { id: "hizb_ut_tahrir_wahhabism", summaryLabel: "Хизб Ут-Тахрир" },
  { id: "new_acropolis", summaryLabel: "Новый Акрополь" },
];

const HR_SUMMARY_COLUMN_SEPARATOR = "\t";

export type SectarianismProfileScore = {
  profileId: SectarianismProfileId;
  displayName: string;
  scorePercent: number;
  detected: boolean;
};

export type SectarianismHrProfileRow = {
  profileId: SectarianismProfileId;
  summaryLabel: string;
  scorePercent: number;
  detected: boolean;
};

export type SectarianismEvaluation = {
  answeredCount: number;
  totalCount: number;
  complete: boolean;
  profileScores: ReadonlyArray<SectarianismProfileScore>;
  detectedProfiles: ReadonlyArray<SectarianismProfileScore>;
  anyDetected: boolean;
  /** Две строки сводки «ИТОГО» для HR-отчёта. */
  hrSummaryLines: ReadonlyArray<string>;
  /** Строки по каждой секте в порядке сводной таблицы. */
  hrProfileRows: ReadonlyArray<SectarianismHrProfileRow>;
  /** Строки результатов для блока отчёта. */
  resultLines: ReadonlyArray<string>;
  /** Полные тексты характеристик для HR (только выявленные профили). */
  hrCharacteristicParagraphs: ReadonlyArray<string>;
  /** Краткий вывод для руководителя при отсутствии срабатывания. */
  managerBriefWhenClear: string;
};

/** Форматирует процент совпадения для отображения в отчёте. */
export function formatSectarianismPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Считает процент совпадения ответов с ключом по каждому профилю секты.
 */
export function computeSectarianismEvaluation(
  stepAnswers: AuditStepAnswers | undefined
): SectarianismEvaluation {
  const answeredCount = getStepAnsweredCount(stepAnswers);
  const complete = answeredCount >= AUDIT_STEP_26_QUESTION_COUNT;

  const profileScores: SectarianismProfileScore[] = SECTARIANISM_PROFILE_KEYS.map((profile) => {
    let scorePercent = 0;
    for (const entry of profile.entries) {
      const key = `q${String(entry.questionIndex)}`;
      const raw = stepAnswers?.[key];
      if (typeof raw === "string" && raw === entry.optionId) {
        scorePercent += entry.weightPercent;
      }
    }
    const rounded = Math.round(scorePercent * 10) / 10;
    return {
      profileId: profile.id,
      displayName: profile.displayName,
      scorePercent: rounded,
      detected: rounded >= SECTARIANISM_DETECTION_THRESHOLD_PERCENT,
    };
  });

  const detectedProfiles = profileScores.filter((item) => item.detected);
  const scoresById = new Map(profileScores.map((item) => [item.profileId, item]));
  const hrProfileRows: SectarianismHrProfileRow[] = HR_SUMMARY_PROFILE_ORDER.map(
    ({ id, summaryLabel }) => {
      const score = scoresById.get(id);
      return {
        profileId: id,
        summaryLabel,
        scorePercent: score?.scorePercent ?? 0,
        detected: score?.detected ?? false,
      };
    }
  );
  const hrSummaryLines = _buildHrSummaryLines(hrProfileRows);
  const resultLines = [
    ...hrSummaryLines,
    ...hrProfileRows.map(
      (row) =>
        `${row.summaryLabel}: ${formatSectarianismPercent(row.scorePercent)}%${row.detected ? " (выявлено)" : ""}`
    ),
  ];

  const hrCharacteristicParagraphs: string[] = [];
  for (const detected of detectedProfiles) {
    const description = getSectarianismProfileDescription(detected.profileId);
    if (description !== null) {
      hrCharacteristicParagraphs.push(
        formatSectarianismProfileForHr(description, detected.scorePercent)
      );
    }
  }

  const managerBriefWhenClear = complete
    ? SECTARIANISM_CLEAR_CONCLUSION
    : `Заполнено ${String(answeredCount)} из ${String(AUDIT_STEP_26_QUESTION_COUNT)} вопросов; интерпретация по ключу недоступна.`;

  return {
    answeredCount,
    totalCount: AUDIT_STEP_26_QUESTION_COUNT,
    complete,
    profileScores,
    detectedProfiles,
    anyDetected: detectedProfiles.length > 0,
    hrSummaryLines,
    hrProfileRows,
    resultLines,
    hrCharacteristicParagraphs,
    managerBriefWhenClear,
  };
}

/** Собирает абзацы секции сектантства для HR-отчёта. */
export function buildSectarianismHrNarrativeParagraphs(
  evaluation: SectarianismEvaluation
): AuditReportNarrativeParagraph[] {
  const paragraphs: AuditReportNarrativeParagraph[] = [
    narrativePlain(
      `Опросник на выявление склонности к деструктивным группам. Порог выявления: ${String(SECTARIANISM_DETECTION_THRESHOLD_PERCENT)}% совпадения с ключом.`
    ),
    narrativePlain(
      `Заполнено ответов: ${String(evaluation.answeredCount)} из ${String(evaluation.totalCount)}.`
    ),
  ];

  for (const line of evaluation.hrSummaryLines) {
    paragraphs.push(narrativePlain(line));
  }

  for (const row of evaluation.hrProfileRows) {
    const percentText = `${formatSectarianismPercent(row.scorePercent)}%`;
    if (row.detected) {
      paragraphs.push(
        narrativeInlineResult(`${row.summaryLabel}\t`, percentText, "", { highlightDanger: true })
      );
      const description = getSectarianismProfileDescription(row.profileId);
      if (description !== null) {
        paragraphs.push(narrativePlain(`Наименование: ${description.nameLabel}`));
        paragraphs.push(narrativePlain(`Характеристика: ${description.characteristic}`));
        paragraphs.push(narrativePlain(`Особенности: ${description.features}`));
        paragraphs.push(narrativePlain(`Причина экстремизма: ${description.extremismReason}`));
      }
    } else {
      paragraphs.push(narrativePlain(`${row.summaryLabel}\t${percentText}`));
    }
  }

  if (!evaluation.complete) {
    paragraphs.push(
      narrativePlain("Тест заполнен не полностью; заключение по ключу предварительное.")
    );
  } else if (!evaluation.anyDetected) {
    paragraphs.push(narrativePlain(SECTARIANISM_CLEAR_CONCLUSION));
  }

  return paragraphs;
}

function _buildHrSummaryLines(
  rows: ReadonlyArray<SectarianismHrProfileRow>
): ReadonlyArray<string> {
  const cells = rows.map(
    (row) => `${row.summaryLabel}\t${formatSectarianismPercent(row.scorePercent)}%`
  );
  return [
    `ИТОГО: ${cells.slice(0, 4).join(HR_SUMMARY_COLUMN_SEPARATOR)}`,
    cells.slice(4).join(HR_SUMMARY_COLUMN_SEPARATOR),
  ];
}
