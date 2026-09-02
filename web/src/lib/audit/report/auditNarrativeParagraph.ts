/**
 * Абзацы нарративных секций отчёта: обычный текст и выделенный результат.
 */

/** Один абзац нарративной секции (строка — для обратной совместимости со старыми JSON). */
export type AuditReportNarrativeParagraphInput = string | AuditReportNarrativeParagraph;

/** Структурированный абзац: ввод методики, выделенный результат или смешанная строка. */
export type AuditReportNarrativeParagraph = {
  /** Обычный текст (ввод методики, пояснение). */
  text?: string;
  /** Текст до выделенного результата (обычный шрифт). */
  prefix?: string;
  /** Ключевой результат — крупно, жирно, акцентным цветом в PDF. */
  highlight?: string;
  /** Текст после выделенного результата (обычный шрифт). */
  suffix?: string;
  /** Несколько строк с абзацным отступом (блок пар качеств Кейрси и т.п.). */
  indentedLines?: ReadonlyArray<string>;
  /** Подзаголовок секции — жирный акцентный цвет. */
  brandSubheading?: boolean;
  /** Ключевой результат отображается красным (критическое ПИ). */
  highlightDanger?: boolean;
  /** Жирный термин в начале строки (определение шкалы, чёрный шрифт). */
  boldTerm?: string;
  /** Пояснение после термина. */
  termDescription?: string;
};

/** Обычный абзац без выделения. */
export function narrativePlain(text: string): AuditReportNarrativeParagraph {
  return { text };
}

/** Выделенный результат на отдельной строке. */
export function narrativeHighlight(highlight: string): AuditReportNarrativeParagraph {
  return { highlight };
}

/** Строка «префикс + результат + суффикс» (суффикс — обычным шрифтом). */
export function narrativeInlineResult(
  prefix: string,
  highlight: string,
  suffix?: string,
  options?: { highlightDanger?: boolean }
): AuditReportNarrativeParagraph {
  return {
    prefix,
    highlight,
    suffix: suffix !== undefined && suffix.length > 0 ? suffix : undefined,
    highlightDanger: options?.highlightDanger === true ? true : undefined,
  };
}

/** Блок строк с абзацным отступом (каждая строка — на своей линии). */
export function narrativeIndentedLines(
  lines: ReadonlyArray<string>
): AuditReportNarrativeParagraph {
  return { indentedLines: lines };
}

/** Подзаголовок внутри секции (жирный, акцентный цвет). */
export function narrativeBrandSubheading(text: string): AuditReportNarrativeParagraph {
  return { text, brandSubheading: true };
}

/** Определение термина: жирное название и пояснение через тире. */
export function narrativeBoldTermDefinition(
  term: string,
  description: string
): AuditReportNarrativeParagraph {
  return { boldTerm: term, termDescription: description };
}

/** Приводит строку или объект к единому виду. */
export function normalizeNarrativeParagraph(
  input: AuditReportNarrativeParagraphInput
): AuditReportNarrativeParagraph {
  if (typeof input === "string") {
    return { text: input };
  }
  return input;
}

/** Склеивает абзац в одну строку (для краткой выжимки руководителю). */
export function narrativeParagraphPlainText(
  input: AuditReportNarrativeParagraphInput
): string {
  const para = normalizeNarrativeParagraph(input);
  if (para.indentedLines !== undefined && para.indentedLines.length > 0) {
    return para.indentedLines.join(" ");
  }
  if (para.boldTerm !== undefined) {
    return `${para.boldTerm} — ${para.termDescription ?? ""}`;
  }
  if (para.highlight !== undefined) {
    return [para.prefix, para.highlight, para.suffix].filter(Boolean).join("");
  }
  return para.text ?? "";
}

/** Есть ли в абзаце выделенный результат. */
export function narrativeParagraphHasHighlight(
  input: AuditReportNarrativeParagraphInput
): boolean {
  const para = normalizeNarrativeParagraph(input);
  return para.highlight !== undefined && para.highlight.trim().length > 0;
}
