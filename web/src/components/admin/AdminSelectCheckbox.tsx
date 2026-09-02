"use client";

import React from "react";

export type AdminSelectCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
  /** Компактный вид без текста (только чекбокс). */
  hideLabel?: boolean;
};

/**
 * Чекбокс выбора элемента в админ-списках.
 */
export function AdminSelectCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  onChange,
  label,
  hideLabel = false,
}: AdminSelectCheckboxProps): React.ReactElement {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      className={`inline-flex items-center gap-2 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        onClick={(event) => event.stopPropagation()}
        aria-label={label}
        className="h-4 w-4 shrink-0 rounded border-black/25 accent-[#00B596]"
      />
      {hideLabel ? null : (
        <span className="text-[14px] font-semibold text-[#5F5E5E]">{label}</span>
      )}
    </label>
  );
}
