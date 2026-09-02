"use client";

import React from "react";

export type DocumentViewerActionBarProps = {
  onPrint: () => void;
  onDownload: () => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Панель действий просмотра документа: печать и скачивание.
 */
export function DocumentViewerActionBar({
  onPrint,
  onDownload,
  disabled = false,
  className = "",
}: DocumentViewerActionBarProps): React.ReactElement {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DocumentActionIconButton
        label="Печать"
        disabled={disabled}
        onClick={onPrint}
      >
        <PrintIcon />
      </DocumentActionIconButton>
      <DocumentActionIconButton
        label="Скачать на устройство"
        disabled={disabled}
        onClick={onDownload}
      >
        <DownloadIcon />
      </DocumentActionIconButton>
    </div>
  );
}

type DocumentActionIconButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function DocumentActionIconButton({
  label,
  disabled = false,
  onClick,
  children,
}: DocumentActionIconButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#5F5E5E] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.12)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function PrintIcon(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

function DownloadIcon(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
