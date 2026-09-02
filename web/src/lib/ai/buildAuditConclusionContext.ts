import { sanitizeForAiInput, truncateForAiContext } from "@/lib/ai/sanitizeForAi";
import type { AuditReportJson, AuditReportTestBlock } from "@/lib/audit/report/auditReportTypes";

/**
 * Формирует текстовый контекст для заключения ИИ по полному аудиту (все блоки методик).
 */
export function buildAuditConclusionContext(input: {
  fullName: string;
  sessionId: string;
  assesseeKey: string;
  report: AuditReportJson;
  answersJson: string;
}): string {
  const metricsLines = Object.entries(input.report.metrics).map(
    ([k, v]) => `${sanitizeForAiInput(k, 80)}=${String(v)}`
  );
  const yoyBlock = _formatYearOverYearBlock(input.report);
  const testBlocksBlock = _formatTestBlocksForAi(input.report.testBlocks);
  const answersTrimmed = truncateForAiContext(input.answersJson, 18000);

  return [
    "=== АУДИТ СОСТОЯНИЯ — ПОЛНЫЙ КОНТЕКСТ ДЛЯ ЗАКЛЮЧЕНИЯ ===",
    "",
    `ФИО: ${sanitizeForAiInput(input.fullName, 200)}`,
    `Идентификатор_сессии: ${sanitizeForAiInput(input.sessionId, 200)}`,
    `Канонический_ключ_респондента_assesseeKey: ${sanitizeForAiInput(input.assesseeKey, 200)}`,
    "",
    "--- Агрегированные метрики (числовые) ---",
    metricsLines.length > 0 ? metricsLines.join("\n") : "Метрики не рассчитаны.",
    "",
    "--- Сравнение с прошлой волной ---",
    yoyBlock,
    "",
    "--- Все блоки методик (17): результаты и интерпретации — ОСНОВА ЗАКЛЮЧЕНИЯ ---",
    "Обязательно учти КАЖДЫЙ блок ниже. Не игнорируй блок только потому, что он «слабый» или неполный — опиши, что это значит.",
    "",
    testBlocksBlock,
    "",
    "--- Сырые ответы (JSON по шагам; для уточнения фактов, вторично по отношению к блокам выше) ---",
    answersTrimmed,
  ].join("\n");
}

function _formatYearOverYearBlock(report: AuditReportJson): string {
  if (report.yoy === null) {
    return "Предыдущее_прохождение_с_тем_же_assesseeKey: не найдено (первая волна или нет сохранённого отчёта прошлого года).";
  }
  return [
    `Предыдущая_сессия: ${sanitizeForAiInput(report.yoy.previousSessionId ?? "", 120)}`,
    `Дата_предыдущей: ${sanitizeForAiInput(report.yoy.previousCreatedAt ?? "", 80)}`,
    "Дельты_метрик (after − before; before может быть пустым):",
    ...report.yoy.deltas.map((d) =>
      [
        sanitizeForAiInput(d.label, 120),
        `ключ=${sanitizeForAiInput(d.key, 80)}`,
        `before=${d.before === null ? "null" : String(d.before)}`,
        `after=${String(d.after)}`,
        `delta=${d.delta === null ? "null" : String(d.delta)}`,
      ].join(" | ")
    ),
  ].join("\n");
}

/** Сериализует все блоки отчёта с результатами и текстами интерпретации. */
function _formatTestBlocksForAi(blocks: ReadonlyArray<AuditReportTestBlock>): string {
  if (blocks.length === 0) {
    return "Блоки методик не сформированы.";
  }
  return blocks
    .map((block) => {
      const lines = [
        `### Блок ${String(block.blockIndex).padStart(2, "0")}. ${block.title}`,
        `Методика: ${block.methodology}`,
        "Результаты:",
        ...block.results.map((r) => `• ${r}`),
      ];
      if (block.schubertScale !== undefined) {
        lines.push(
          `Шкала риска (Шуберт): сумма ${String(block.schubertScale.sum)} (диапазон ${String(block.schubertScale.min)}…${String(block.schubertScale.max)})`
        );
      }
      const interpretation = block.interpretation.trim();
      if (interpretation.length > 0) {
        lines.push("Интерпретация по данным испытуемого:");
        lines.push(truncateForAiContext(interpretation, 3500));
      } else {
        lines.push("Интерпретация: данных недостаточно.");
      }
      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}
