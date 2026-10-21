"use client";

import React from "react";

type AvProctorToggleProps = {
  /** true = камера/микрофон выключены (защита AV off). */
  avProctorDisabled: boolean;
  disabled?: boolean;
  /** Компактный вид для таблицы. */
  compact?: boolean;
  onChange: (avProctorDisabled: boolean) => void;
  id?: string;
  "aria-label"?: string;
};

/**
 * Переключатель AV-защиты: справа камера вкл, слева камера выкл.
 */
export function AvProctorToggle({
  avProctorDisabled,
  disabled = false,
  compact = false,
  onChange,
  id,
  "aria-label": ariaLabel,
}: AvProctorToggleProps): React.ReactElement {
  const protectionOn = !avProctorDisabled;
  const trackW = compact ? 52 : 64;
  const trackH = compact ? 28 : 34;
  const knob = compact ? 22 : 28;
  const pad = (trackH - knob) / 2;

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={protectionOn}
      aria-label={ariaLabel ?? (protectionOn ? "Камера и микрофон включены" : "Камера и микрофон выключены")}
      disabled={disabled}
      onClick={() => onChange(!avProctorDisabled)}
      className="relative shrink-0 rounded-full transition-[opacity,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        width: trackW,
        height: trackH,
        backgroundColor: "#C8EBE4",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <span
        aria-hidden
        className="absolute rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-[left] duration-200 ease-out"
        style={{
          width: knob,
          height: knob,
          top: pad,
          left: protectionOn ? trackW - knob - pad : pad,
        }}
      />
    </button>
  );
}
