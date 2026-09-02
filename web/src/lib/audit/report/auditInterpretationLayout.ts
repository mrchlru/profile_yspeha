/**
 * Разметка текстов интерпретации для PDF: абзацы и разделение «о методике» / «заключение».
 */

export type InterpretationLayout = {
  aboutParagraphs: ReadonlyArray<string>;
  conclusionParagraphs: ReadonlyArray<string>;
  /** Склеенный текст для JSON (обратная совместимость). */
  interpretation: string;
};

const CONCLUSION_MARKERS = [
  "Заключение (по экстраполяции):",
  "Заключение:",
] as const;

/** Разбивает текст на абзацы по пустым строкам; длинные абзацы дробит по предложениям. */
export function splitIntoParagraphs(text: string): ReadonlyArray<string> {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }
  const raw = normalized.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out: string[] = [];
  for (const para of raw) {
    out.push(..._chunkLongParagraph(para));
  }
  return out;
}

/** Собирает блок интерпретации для отчёта. */
export function buildInterpretationLayout(
  officialTitle: string,
  methodAbout: ReadonlyArray<string>,
  conclusion: ReadonlyArray<string>
): InterpretationLayout {
  const aboutParagraphs = dedupeParagraphs([
    officialTitle,
    ...methodAbout.flatMap((part) => splitIntoParagraphs(part)),
  ]);
  const conclusionParagraphs = dedupeParagraphs(
    conclusion.flatMap((part) => splitIntoParagraphs(part))
  );
  return {
    aboutParagraphs,
    conclusionParagraphs,
    interpretation: joinInterpretationSections(aboutParagraphs, conclusionParagraphs),
  };
}

/** Делит полный текст интерпретации на «о методике» и «заключение» по маркеру. */
export function splitInterpretationAtConclusion(fullText: string): {
  aboutText: string;
  conclusionText: string | null;
} {
  for (const marker of CONCLUSION_MARKERS) {
    const idx = fullText.indexOf(marker);
    if (idx >= 0) {
      return {
        aboutText: fullText.slice(0, idx).trim(),
        conclusionText: fullText.slice(idx).trim(),
      };
    }
  }
  return { aboutText: fullText.trim(), conclusionText: null };
}

/** Склеивает секции в один текст (поле interpretation в JSON). */
export function joinInterpretationSections(
  aboutParagraphs: ReadonlyArray<string>,
  conclusionParagraphs: ReadonlyArray<string>
): string {
  const parts = [...aboutParagraphs, ...conclusionParagraphs].filter(Boolean);
  return parts.join("\n\n");
}

function dedupeParagraphs(paragraphs: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function _chunkLongParagraph(para: string, maxLen = 340): string[] {
  if (para.length <= maxLen) {
    return [para];
  }
  const sentences = para.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g) ?? [para];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const candidate = current.length > 0 ? `${current} ${trimmed}` : trimmed;
    if (candidate.length <= maxLen) {
      current = candidate;
      continue;
    }
    if (current.length > 0) {
      chunks.push(current);
    }
    current = trimmed;
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks.length > 0 ? chunks : [para];
}
