/**
 * URL страницы прохождения по общей ссылке.
 */
export function surveyPublicLinkUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/custom-survey/open/${encodeURIComponent(token)}`;
}
