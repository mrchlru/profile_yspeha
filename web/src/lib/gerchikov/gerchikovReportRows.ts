import {
  INCOME_SUBQUESTIONS,
  Q1,
  Q15,
  Q16,
  Q17,
  Q18,
  Q19,
  Q2,
  Q20,
  Q21,
  Q22,
  Q23,
  Q3,
  Q4,
  Q5,
  type GerchikovOption,
} from "@/lib/gerchikov/questions";
import type { LegacyGerchikovScreeningStep2Data } from "@/lib/gerchikov/legacyGerchikovScreeningStep2Types";

export type GerchikovReportRow = {
  block: string;
  title: string;
  answerText: string;
};

function joinOptions(options: GerchikovOption[], ids: string[]): string {
  const parts = ids
    .map((id) => options.find((o) => o.id === id)?.text ?? `id=${id}`)
    .filter((s) => s.length > 0);
  return parts.join(" | ");
}

function incomeLabel(v: LegacyGerchikovScreeningStep2Data["q6"]): string {
  if (v === "very") {
    return "Очень важно";
  }
  if (v === "somewhat") {
    return "Не очень важно";
  }
  if (v === "not_at_all") {
    return "Совсем не важно";
  }
  return "—";
}

/**
 * Плоский список вопросов и формулировок ответов для таблиц в Word и аудита.
 */
export function buildGerchikovReportRows(data: LegacyGerchikovScreeningStep2Data): GerchikovReportRow[] {
  const rows: GerchikovReportRow[] = [];

  rows.push({
    block: "Герчиков, вопрос 1",
    title: Q1.title,
    answerText: joinOptions(Q1.options, data.q1),
  });
  rows.push({
    block: "Герчиков, вопрос 2",
    title: Q2.title,
    answerText: data.q2 ? joinOptions(Q2.options, [data.q2]) : "—",
  });
  rows.push({
    block: "Герчиков, вопрос 3",
    title: Q3.title,
    answerText: joinOptions(Q3.options, data.q3),
  });
  rows.push({
    block: "Герчиков, вопрос 4",
    title: Q4.title,
    answerText: joinOptions(Q4.options, data.q4),
  });
  rows.push({
    block: "Герчиков, вопрос 5",
    title: Q5.title,
    answerText: joinOptions(Q5.options, data.q5),
  });

  for (const row of INCOME_SUBQUESTIONS) {
    const v = data[row.key];
    rows.push({
      block: `Герчиков, ${row.key}`,
      title: row.title,
      answerText: incomeLabel(v),
    });
  }

  rows.push({
    block: "Герчиков, вопрос 15",
    title: Q15.title,
    answerText: data.q15 ? joinOptions(Q15.options, [data.q15]) : "—",
  });
  rows.push({
    block: "Герчиков, вопрос 16",
    title: Q16.title,
    answerText: joinOptions(Q16.options, data.q16),
  });
  rows.push({
    block: "Герчиков, вопрос 17",
    title: Q17.title,
    answerText: joinOptions(Q17.options, data.q17),
  });
  rows.push({
    block: "Герчиков, вопрос 18",
    title: Q18.title,
    answerText: joinOptions(Q18.options, data.q18),
  });
  rows.push({
    block: "Герчиков, вопрос 19",
    title: Q19.title,
    answerText: joinOptions(Q19.options, data.q19),
  });
  rows.push({
    block: "Герчиков, вопрос 20",
    title: Q20.title,
    answerText: joinOptions(Q20.options, data.q20),
  });
  rows.push({
    block: "Герчиков, вопрос 21",
    title: Q21.title,
    answerText: joinOptions(Q21.options, data.q21),
  });

  if (data.isLeader === true) {
    rows.push({
      block: "Герчиков, вопрос 22 (руководитель)",
      title: Q22.title,
      answerText: joinOptions(Q22.options, data.q22),
    });
  } else if (data.isLeader === false) {
    rows.push({
      block: "Герчиков, вопрос 23 (не руководитель)",
      title: Q23.title,
      answerText: joinOptions(Q23.options, data.q23),
    });
  } else {
    rows.push({
      block: "Герчиков, ветка 22/23",
      title: "Не указано, руководитель ли респондент",
      answerText: "—",
    });
  }

  return rows;
}
