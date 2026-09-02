/**
 * Скачивает файл по URL с именем файла.
 */
export function downloadFileFromUrl(url: string, fileName: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Открывает диалог печати для содержимого iframe.
 */
export function printIframeContent(iframe: HTMLIFrameElement | null): void {
  const frameWindow = iframe?.contentWindow;
  if (!frameWindow) {
    window.print();
    return;
  }
  frameWindow.focus();
  frameWindow.print();
}

/**
 * Печатает HTML-фрагмент в отдельном окне.
 */
export function printHtmlFragment(title: string, html: string): void {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; padding: 24px; line-height: 1.5; }
    h1, h2, h3, h4 { color: #444; }
    section { margin-bottom: 20px; }
  </style>
</head>
<body>${html}</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

/**
 * Скачивает HTML как файл.
 */
export function downloadHtmlFile(fileName: string, title: string, bodyHtml: string): void {
  const content = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body>${bodyHtml}</body>
</html>`;
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  downloadFileFromUrl(url, fileName);
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
