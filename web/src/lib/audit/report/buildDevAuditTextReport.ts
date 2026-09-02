import type { AuditAnswersMap, AuditStepAnswers } from "@/lib/audit/auditAnswers";
import { AUDIT_TEST_BLOCK_SPECS } from "@/lib/audit/report/auditTestBlockMeta";
import type { AuditReportTestBlock } from "@/lib/audit/report/auditReportTypes";
import { buildAuditTestBlocks } from "@/lib/audit/report/buildAuditTestBlocks";

export type DevAuditTextReportMeta = {
  fullName: string;
  sessionId: string;
  generatedAt: string;
};

/**
 * Собирает плоский текстовый отчёт по пройденным шагам аудита (без PDF и ИИ).
 * В DEV-режиме включаются только блоки методик, для которых есть ответы в `answers`.
 */
export function buildDevAuditTextReport(
  answers: AuditAnswersMap,
  meta: DevAuditTextReportMeta
): string {
  const blocks = buildAuditTestBlocks(answers);
  const included = blocks.filter((block, index) => {
    const spec = AUDIT_TEST_BLOCK_SPECS[index];
    if (spec === undefined) {
      return false;
    }
    return _blockHasAnswers(answers, spec.stepIndexes);
  });

  const header = [
    "АУДИТ СОСТОЯНИЯ — ТЕКСТОВЫЙ ОТЧЁТ (DEV)",
    `Участник: ${meta.fullName}`,
    `Сессия: ${meta.sessionId}`,
    `Сформирован: ${meta.generatedAt}`,
    `Методик с ответами: ${String(included.length)}`,
    "",
  ];

  if (included.length === 0) {
    return [...header, "Нет ответов ни по одному шагу — нечего интерпретировать."].join("\n");
  }

  const body = included.map((block) => _formatTestBlock(block)).join("\n\n");
  return `${header.join("\n")}${body}\n`;
}

function _blockHasAnswers(
  answers: AuditAnswersMap,
  stepIndexes: ReadonlyArray<number>
): boolean {
  return stepIndexes.some((stepIndex) => _stepHasAnswers(answers[stepIndex]));
}

function _stepHasAnswers(step: AuditStepAnswers | undefined): boolean {
  if (step === undefined) {
    return false;
  }
  for (const value of Object.values(step)) {
    if (_isAnswered(value)) {
      return true;
    }
  }
  return false;
}

function _isAnswered(value: unknown): boolean {
  if (value === null || value === undefined || value === "") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function _formatTestBlock(block: AuditReportTestBlock): string {
  const lines: string[] = [
    "─".repeat(64),
    block.title,
    block.methodology,
  ];

  if (block.results.length > 0) {
    lines.push("", "Результаты:");
    for (const row of block.results) {
      lines.push(`  • ${row}`);
    }
  }

  if (block.conclusionParagraphs.length > 0) {
    lines.push("", "Заключение:");
    for (const paragraph of block.conclusionParagraphs) {
      lines.push(paragraph);
    }
  } else if (block.interpretation.trim().length > 0) {
    lines.push("", block.interpretation.trim());
  }

  return lines.join("\n");
}
