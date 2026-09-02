/**
 * Убирает из текста заключения цифры и типичные названия методик (страховка после ИИ).
 */
export function sanitizeManagerBriefConclusionText(text: string): string {
  let out = text.replace(/\r\n/g, "\n").trim();

  out = out.replace(/\b\d+([.,]\d+)?\b/g, "");

  const bannedPhrases = [
    /\bCFIT\b/gi,
    /\bIQ\b/gi,
    /\bMBI\b/gi,
    /\bKОС\b/gi,
    /\bКОС\b/g,
    /\bГерчиков(?:а|у|ом)?\b/gi,
    /\bМаслач(?:а|у|ом)?\b/gi,
    /\bТомас(?:а|-)?\s*Килман(?:на|ну|ном)?\b/gi,
    /\bКейрси\b/gi,
    /\bШуберт(?:а|у|ом)?\b/gi,
    /\bРоттер(?:а|у|ом)?\b/gi,
    /\bСтреляу\b/gi,
    /\bПочебут\b/gi,
    /\bтест\s+\d+/gi,
    /\bметодик[аи]\b/gi,
  ];

  for (const pattern of bannedPhrases) {
    out = out.replace(pattern, "");
  }

  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  out = out.replace(/ +\n/g, "\n");

  return out.trim();
}
