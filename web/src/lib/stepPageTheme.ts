/**
 * Общие классы для экранов шагов в стиле приветственной страницы.
 */

export const stepPageContentClass =
  "mx-auto w-full max-w-[860px] px-4 py-8 sm:pb-12";

export const stepSectionTitleClass =
  "mb-5 text-[28px] sm:text-[32px] font-extrabold leading-tight text-[#8C8C8C]";

export const stepSurfaceCardClass =
  "rounded-[34px] bg-[#DDDDDD] shadow-[0px_4px_75px_0px_rgba(0,0,0,0.20)]";

/** Карточки вопросов: без тени, скругление по макету. */
export const questionCardSurfaceClass =
  "rounded-[41px] bg-[#DDDDDD] shadow-none";

export const stepQuestionTitleClass =
  "text-[18px] sm:text-[20px] font-extrabold text-[#5F5E5E] leading-[1.35]";

export const stepSecondaryTextClass =
  "text-[16px] font-normal text-[#5F5E5E] leading-[1.4]";

export const stepLabelClass = "text-sm font-normal text-[#5F5E5E]";

export const stepInputClass =
  "mt-2 w-full rounded-2xl border border-black/15 bg-white/85 px-4 py-2.5 text-[16px] font-normal text-[#4F4F4F] outline-none focus:ring-2 focus:ring-[#00B596]/35";

export const stepNavPrimaryButtonClass =
  "h-[56px] min-w-[160px] px-8 text-[20px] font-extrabold leading-none";

/**
 * Запрет выделения текста на экранах скрининга; поля ввода анкеты остаются редактируемыми.
 */
export const screeningNoSelectContentClass =
  "select-none [&_input]:select-text [&_textarea]:select-text";

/**
 * Фиксированная позиция бэйджа таймера на шагах аудита.
 * Ниже шапки StepLayout (pt 20px + FAQ 72px + зазор 32px), чтобы не перекрывать иконку FAQ
 * до прокрутки страницы.
 */
export const auditTimerBadgeFixedClass =
  "pointer-events-auto fixed right-3 top-[124px] z-40 sm:right-6";
