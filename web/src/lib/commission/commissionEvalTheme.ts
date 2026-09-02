/**
 * Адаптивные классы оценочного листа комиссии (телефон → планшет → десктоп).
 */

/** Контейнер страницы: узкие поля на телефоне, чуть шире на больших экранах. */
export const commissionEvalPageClass =
  "mx-auto box-border w-full min-w-0 max-w-[860px] overflow-x-hidden px-3 py-4 sm:px-4 sm:py-8 lg:max-w-[960px] lg:px-6";

/** Карточка секции анкеты. */
export const commissionEvalCardClass =
  "box-border w-full min-w-0 overflow-hidden rounded-[24px] bg-[#DDDDDD] shadow-[0px_4px_75px_0px_rgba(0,0,0,0.20)] px-4 py-5 sm:rounded-[34px] sm:px-6 sm:py-8";

export const commissionEvalTitleClass =
  "text-[22px] font-extrabold leading-tight text-[#8C8C8C] sm:text-[28px] lg:text-[32px]";

export const commissionEvalSectionTitleClass =
  "text-[17px] font-extrabold leading-snug text-[#5F5E5E] sm:text-[20px]";

export const commissionEvalBodyTextClass =
  "text-[15px] font-normal leading-relaxed text-[#5F5E5E] sm:text-[16px]";

export const commissionEvalLabelClass =
  "block text-[14px] font-normal leading-snug text-[#5F5E5E] sm:text-sm";

export const commissionEvalInputClass =
  "mt-2 w-full min-w-0 rounded-2xl border border-black/15 bg-white/85 px-3 py-3 text-base font-normal text-[#4F4F4F] outline-none focus:ring-2 focus:ring-[#00B596]/35 sm:px-4 sm:py-2.5";

export const commissionEvalTextareaClass = `${commissionEvalInputClass} min-h-[140px] resize-y sm:min-h-[120px]`;

/** Сетка оценок 1–10: 5 колонок × 2 ряда, удобно для пальца. */
export const commissionScaleGridClass = "mt-3 grid grid-cols-5 gap-2 sm:gap-2.5";

/**
 * Кнопка шкалы 1–10.
 */
export function commissionScaleButtonClass(selected: boolean, disabled: boolean): string {
  const base =
    "flex h-11 w-full min-w-0 cursor-pointer items-center justify-center rounded-2xl border text-[15px] font-bold transition sm:h-10 sm:rounded-full sm:text-sm";
  const state = selected
    ? "border-[#00B596] bg-[#00B596] text-white"
    : "border-black/15 bg-white/80 text-[#5F5E5E] hover:border-[#00B596]/50 active:scale-[0.98]";
  const lock = disabled ? "pointer-events-none opacity-70" : "";
  return `${base} ${state} ${lock}`;
}

/** Липкая панель «Сохранить / Отправить» на мобильных. */
export const commissionEvalStickyActionsClass =
  "sticky bottom-0 z-20 w-full border-t border-black/10 bg-[#F2F2F2]/95 py-3 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:py-0 sm:backdrop-blur-none";

/** Отступ с учётом safe-area (вырез iPhone). */
export const commissionEvalSafeBottomClass =
  "pb-[max(0.75rem,env(safe-area-inset-bottom))]";

export const commissionEvalPrimaryButtonClass =
  "h-12 w-full rounded-[51px] px-6 text-[17px] font-extrabold sm:h-auto sm:w-auto sm:min-w-[160px] sm:text-[18px]";

export const commissionEvalSecondaryButtonClass =
  "h-12 w-full rounded-full border border-black/10 bg-white/80 px-6 text-[17px] font-semibold sm:h-auto sm:w-auto sm:px-5 sm:py-3 sm:text-base";

/** Кнопка «Из банка» у развёрнутого вопроса. */
export const commissionEvalBankButtonClass =
  "min-h-12 h-auto w-full rounded-full border border-black/10 bg-white/80 px-5 py-3 text-[14px] font-semibold leading-none sm:w-auto sm:min-w-[200px] sm:text-[15px]";

/** Корневой контейнер модалки банка: ровно по viewport, без flex-смещения. */
export const commissionBankPickerRootClass = "fixed inset-0 z-[100] overflow-hidden";

/** Затемнение фона. */
export const commissionBankPickerOverlayClass = "absolute inset-0 bg-black/50";

/** Диалог банка: жёсткое центрирование через translate. */
export const commissionBankPickerDialogClass =
  "absolute left-1/2 top-1/2 box-border flex w-[min(20.5rem,calc(100%-2rem))] max-h-[min(82dvh,560px)] min-w-0 -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] bg-[#F2F2F2] shadow-[0px_8px_40px_rgba(0,0,0,0.28)] sm:max-w-md sm:max-h-[min(85vh,680px)] sm:rounded-[28px]";

export const commissionBankPickerHeaderClass =
  "shrink-0 border-b border-black/10 px-3 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-5";

export const commissionBankPickerListClass =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2.5 sm:px-4 sm:py-3";

export const commissionBankPickerFooterClass =
  "shrink-0 border-t border-black/10 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5";

export const commissionBankPickerItemButtonClass =
  "min-h-12 w-full min-w-0 rounded-2xl border border-black/10 bg-white/90 px-3 py-3 text-left text-[14px] leading-relaxed text-[#5F5E5E] transition hover:border-[#00B596]/40 hover:bg-white active:scale-[0.99] sm:min-h-11 sm:px-4 sm:text-[16px]";
