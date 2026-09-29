/**
 * Запрашивает полноэкранный режим для документа.
 * Вызывать из обработчика клика пользователя (жест браузера).
 */
export async function requestProctorFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") {
    return false;
  }
  if (document.fullscreenElement) {
    return true;
  }
  try {
    await document.documentElement.requestFullscreen();
    return document.fullscreenElement !== null;
  } catch {
    return false;
  }
}

/** Проверяет, активен ли сейчас полноэкранный режим. */
export function isProctorFullscreenActive(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.fullscreenElement !== null;
}
