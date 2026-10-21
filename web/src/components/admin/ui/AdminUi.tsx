"use client";

import React from "react";

export type AdminSegmentOption<T extends string> = {
  value: T;
  label: string;
};

type AdminSegmentControlProps<T extends string> = {
  options: ReadonlyArray<AdminSegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
};

/**
 * Сегментный переключатель (фильтры, табы).
 */
export function AdminSegmentControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: AdminSegmentControlProps<T>): React.ReactElement {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex max-w-full flex-wrap gap-0.5 rounded-[11px] bg-[var(--admin-segment-track)] p-[3px]"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`h-[34px] shrink-0 rounded-[9px] px-4 text-[14px] transition disabled:opacity-50 ${
              active
                ? "bg-[var(--admin-surface)] font-semibold text-[var(--admin-text)] shadow-[var(--admin-shadow-segment)]"
                : "bg-transparent font-medium text-[var(--admin-text-2)] hover:text-[var(--admin-text)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type AdminSearchFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
};

/**
 * Поле поиска в стиле DriveS admin.
 */
export function AdminSearchField({
  id,
  value,
  onChange,
  placeholder,
  label = "Поиск",
}: AdminSearchFieldProps): React.ReactElement {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <div className="flex h-[52px] items-center gap-3 rounded-[14px] bg-[var(--admin-surface)] px-[18px] shadow-[var(--admin-shadow-card)]">
        <SearchIcon />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-[var(--admin-text)] outline-none placeholder:text-[var(--admin-text-3)]"
        />
      </div>
    </label>
  );
}

export type AdminStatusChipTone = "ok" | "warn" | "info" | "neutral" | "danger";

type AdminStatusChipProps = {
  label: string;
  tone: AdminStatusChipTone;
};

/**
 * Чип статуса (приглашения, прохождения).
 */
export function AdminStatusChip({ label, tone }: AdminStatusChipProps): React.ReactElement {
  const toneClass: Record<AdminStatusChipTone, string> = {
    ok: "bg-[var(--admin-ok-bg)] text-[var(--admin-ok)]",
    warn: "bg-[var(--admin-warn-bg)] text-[var(--admin-warn)]",
    info: "bg-[var(--admin-info-bg)] text-[var(--admin-info)]",
    neutral: "bg-[var(--admin-neutral-bg)] text-[var(--admin-neutral)]",
    danger: "bg-[var(--admin-danger-bg)] text-[var(--admin-danger)]",
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[13px] font-semibold ${toneClass[tone]}`}
    >
      {label}
    </span>
  );
}

type AdminTestChipProps = {
  label: string;
};

export function AdminTestChip({ label }: AdminTestChipProps): React.ReactElement {
  return (
    <span className="inline-flex rounded-full bg-[var(--admin-surface-muted)] px-[11px] py-1 text-[13px] font-medium text-[var(--admin-text-2)]">
      {label}
    </span>
  );
}

type AdminToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function AdminToggle({
  checked,
  onChange,
  label,
  disabled = false,
}: AdminToggleProps): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-[46px] shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[var(--admin-accent)]" : "bg-[#c7c7cc]"
      }`}
    >
      <span
        className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function SearchIcon(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="shrink-0 text-[var(--admin-text-3)]"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  );
}
