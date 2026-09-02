/**
 * Прокручивает окно к началу страницы (после перехода к следующему шагу теста).
 */
export function scrollPageToTop(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.scrollTo(0, 0);
}
