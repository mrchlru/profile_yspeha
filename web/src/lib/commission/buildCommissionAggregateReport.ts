import { escapeHtmlForPdf } from "@/lib/pdf/escapeHtml";
import {
  COMMISSION_FIXED_SCALE_QUESTIONS,
  formatCommissionMemberLabel,
  type CommissionScaleAnswers,
  type CommissionVariableAnswer,
} from "@/lib/commission/commissionEvalConstants";
import { averageCommissionScaleScore } from "@/lib/commission/commissionEvalValidation";

export type CommissionAggregateMemberColumn = {
  memberId: string;
  label: string;
  lastName: string;
  firstName: string;
};

export type CommissionAggregateSheetRow = {
  memberId: string;
  memberLabel: string;
  scaleAnswers: CommissionScaleAnswers;
  variableAnswers: ReadonlyArray<CommissionVariableAnswer>;
};

export type CommissionAggregateReportData = {
  candidateName: string;
  vacancyTitle: string;
  members: ReadonlyArray<CommissionAggregateMemberColumn>;
  scaleMatrix: ReadonlyArray<{
    questionId: string;
    questionText: string;
    scoresByMember: Record<string, number | null>;
    average: number | null;
  }>;
  variableBlocks: ReadonlyArray<{
    memberLabel: string;
    items: ReadonlyArray<CommissionVariableAnswer>;
  }>;
  overallScaleAverage: number | null;
};

/**
 * Собирает данные и HTML сводного заключения комиссии.
 */
export function buildCommissionAggregateReport(input: {
  candidateName: string;
  vacancyTitle: string;
  sheets: ReadonlyArray<CommissionAggregateSheetRow>;
}): { reportData: CommissionAggregateReportData; reportHtml: string } {
  const members: CommissionAggregateMemberColumn[] = input.sheets.map((sheet) => ({
    memberId: sheet.memberId,
    label: sheet.memberLabel,
    lastName: sheet.memberLabel.split(" ")[0] ?? sheet.memberLabel,
    firstName: "",
  }));

  const scaleMatrix = COMMISSION_FIXED_SCALE_QUESTIONS.map((question) => {
    const scoresByMember: Record<string, number | null> = {};
    const values: number[] = [];
    for (const sheet of input.sheets) {
      const score = sheet.scaleAnswers[question.id];
      if (typeof score === "number") {
        scoresByMember[sheet.memberId] = score;
        values.push(score);
      } else {
        scoresByMember[sheet.memberId] = null;
      }
    }
    return {
      questionId: question.id,
      questionText: question.text,
      scoresByMember,
      average: averageCommissionScaleScore(values),
    };
  });

  const allScaleValues = scaleMatrix.flatMap((row) =>
    Object.values(row.scoresByMember).filter((value): value is number => value !== null)
  );

  const variableBlocks = input.sheets.map((sheet) => ({
    memberLabel: sheet.memberLabel,
    items: sheet.variableAnswers,
  }));

  const reportData: CommissionAggregateReportData = {
    candidateName: input.candidateName,
    vacancyTitle: input.vacancyTitle,
    members,
    scaleMatrix,
    variableBlocks,
    overallScaleAverage: averageCommissionScaleScore(allScaleValues),
  };

  return {
    reportData,
    reportHtml: _renderCommissionAggregateHtml(reportData, null),
  };
}

/**
 * Перерисовывает HTML с блоком ИИ-заключения.
 */
export function renderCommissionAggregateHtml(
  reportData: CommissionAggregateReportData,
  aiConclusion: string | null
): string {
  return _renderCommissionAggregateHtml(reportData, aiConclusion);
}

function _renderCommissionAggregateHtml(
  data: CommissionAggregateReportData,
  aiConclusion: string | null
): string {
  const headerCells = data.members
    .map((member) => `<th>${escapeHtmlForPdf(member.label)}</th>`)
    .join("");

  const bodyRows = data.scaleMatrix
    .map((row) => {
      const cells = data.members
        .map((member) => {
          const value = row.scoresByMember[member.memberId];
          return `<td>${value === null ? "—" : String(value)}</td>`;
        })
        .join("");
      const avg = row.average === null ? "—" : String(row.average);
      return `<tr><td>${escapeHtmlForPdf(row.questionText)}</td>${cells}<td><strong>${avg}</strong></td></tr>`;
    })
    .join("");

  const variableHtml = data.variableBlocks
    .map((block) => {
      const items = block.items
        .map(
          (item) =>
            `<div class="var-item"><p class="var-q"><strong>Вопрос:</strong> ${escapeHtmlForPdf(item.questionText)}</p><p class="var-a"><strong>Заключение:</strong> ${escapeHtmlForPdf(item.conclusion)}</p></div>`
        )
        .join("");
      return `<section class="member-block"><h3>${escapeHtmlForPdf(block.memberLabel)}</h3>${items}</section>`;
    })
    .join("");

  const averagesRows = data.scaleMatrix
    .map(
      (row) =>
        `<tr><td>${escapeHtmlForPdf(row.questionText)}</td><td>${row.average === null ? "—" : String(row.average)}</td></tr>`
    )
    .join("");

  const aiBlock = aiConclusion
    ? `<section class="ai"><h2>Заключение о кандидате (ИИ)</h2><p>${escapeHtmlForPdf(aiConclusion)}</p></section>`
    : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>Заключение комиссии</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;color:#333;padding:24px;max-width:1100px;margin:0 auto}
h1{font-size:22px;margin-bottom:8px}
h2{font-size:18px;margin-top:28px}
h3{font-size:16px;margin-top:20px}
table{border-collapse:collapse;width:100%;margin-top:12px;font-size:14px}
th,td{border:1px solid #ccc;padding:8px 10px;text-align:center}
th:first-child,td:first-child{text-align:left;min-width:220px}
.var-item{margin:12px 0;padding:12px;background:#f7f7f7;border-radius:8px}
.var-q{margin:0 0 8px}
.var-a{margin:0;white-space:pre-wrap}
.ai p{white-space:pre-wrap;line-height:1.5}
.muted{color:#666;font-size:14px}
</style>
</head>
<body>
<h1>Заключение комиссии</h1>
<p class="muted"><strong>Кандидат:</strong> ${escapeHtmlForPdf(data.candidateName)}</p>
<p class="muted"><strong>Вакансия:</strong> ${escapeHtmlForPdf(data.vacancyTitle)}</p>
<h2>Шкальные оценки (1–10)</h2>
<table>
<thead><tr><th>Вопрос</th>${headerCells}<th>Среднее</th></tr></thead>
<tbody>${bodyRows}</tbody>
</table>
<h2>Развёрнутые вопросы и заключения</h2>
${variableHtml}
<h2>Сводка средних значений по шкале</h2>
<table>
<thead><tr><th>Вопрос</th><th>Среднее</th></tr></thead>
<tbody>${averagesRows}</tbody>
</table>
<p><strong>Общее среднее по шкале:</strong> ${data.overallScaleAverage === null ? "—" : String(data.overallScaleAverage)}</p>
${aiBlock}
</body>
</html>`;
}

/**
 * Преобразует строки БД в строки агрегации.
 */
export function mapSubmittedSheetsForAggregate(
  rows: ReadonlyArray<{
    memberId: string;
    memberLastName: string;
    memberFirstName: string;
    scaleAnswers: unknown;
    variableAnswers: unknown;
  }>
): CommissionAggregateSheetRow[] {
  return rows.map((row) => ({
    memberId: row.memberId,
    memberLabel: formatCommissionMemberLabel(row.memberLastName, row.memberFirstName),
    scaleAnswers: (row.scaleAnswers as CommissionScaleAnswers) ?? {},
    variableAnswers: (row.variableAnswers as CommissionVariableAnswer[]) ?? [],
  }));
}
