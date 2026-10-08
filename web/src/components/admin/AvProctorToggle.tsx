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
      className="relative shrink-0 rounded-full transition-[opacity,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B596]/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        width: trackW,
        height: trackH,
        backgroundColor: "#C8EBE4",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <span
        aria-hidden
        className="absolute flex items-center justify-center rounded-full bg-[#007A68] text-white shadow-[0_1px_3px_rgba(0,80,70,0.35)] transition-[left] duration-200 ease-out"
        style={{
          width: knob,
          height: knob,
          top: pad,
          left: protectionOn ? trackW - knob - pad : pad,
        }}
      >
        {protectionOn ? <CameraIcon size={compact ? 12 : 14} /> : <CameraOffIcon size={compact ? 12 : 14} />}
      </span>
    </button>
  );
}

function CameraIcon({ size }: { size: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2.1l1.2-1.6A1.5 1.5 0 0 1 11 3.8h2a1.5 1.5 0 0 1 1.2.6L15.4 6h2.1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CameraOffIcon({ size }: { size: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2.1l1.2-1.6A1.5 1.5 0 0 1 11 3.8h2a1.5 1.5 0 0 1 1.2.6L15.4 6h2.1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19.5 19 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
