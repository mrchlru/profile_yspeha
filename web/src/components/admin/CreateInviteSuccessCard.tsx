"use client";

import React from "react";

import {
  adminPanelCardClass,
  adminPanelInsetClass,
  adminPanelMutedTextClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin/adminPanelTheme";

export type CreateInviteSuccessCardProps = {
  testTitle: string;
  personLabel: string;
  code: string;
  validThroughLabel: string;
  devMode: boolean;
  copyBusyLabel: string;
  onCopyInvite: () => void;
  onCopyLink: () => void;
  onCreateAnother: () => void;
  archiveFolderName?: string | null;
  interviewFolderName?: string | null;
};

/**
 * Экран «Приглашение готово» после создания кода (макет 4.4).
 */
export function CreateInviteSuccessCard({
  testTitle,
  personLabel,
  code,
  validThroughLabel,
  devMode,
  copyBusyLabel,
  onCopyInvite,
  onCopyLink,
  onCreateAnother,
  archiveFolderName,
  interviewFolderName,
}: CreateInviteSuccessCardProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 py-8">
      <div
        className={`w-full max-w-[560px] space-y-6 p-10 text-center ${adminPanelCardClass} shadow-[var(--admin-shadow-elevated)]`}
        role="dialog"
        aria-labelledby="invite-success-title"
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--admin-ok-bg)] text-[28px] text-[var(--admin-ok)]">
          ✓
        </div>
        <div>
          <h2
            id="invite-success-title"
            className="text-[28px] font-bold tracking-[-0.02em] text-[var(--admin-text)]"
          >
            Приглашение готово
          </h2>
          <p className={`mt-2 ${adminPanelMutedTextClass}`}>
            {testTitle} · {personLabel}
          </p>
        </div>

        <div className={`space-y-2 p-5 text-left ${adminPanelInsetClass}`}>
          <p className="text-[13px] font-medium text-[var(--admin-text-3)]">Код доступа</p>
          <p className="admin-mono text-[32px] font-semibold tracking-[0.08em] text-[var(--admin-text)]">
            {code}
            {devMode ? (
              <span className="ml-2 align-middle text-[12px] font-bold text-[var(--admin-warn)]">
                DEV
              </span>
            ) : null}
          </p>
          <p className="text-[14px] text-[var(--admin-text-3)]">Действует до {validThroughLabel}</p>
          {archiveFolderName ? (
            <p className="text-[13px] text-[var(--admin-accent)]">
              Папка в архиве: {archiveFolderName}
            </p>
          ) : null}
          {interviewFolderName ? (
            <p className="text-[13px] text-[var(--admin-accent)]">
              Папка в «Собеседование»: {interviewFolderName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onCopyInvite} className={`${adminPrimaryButtonClass} sm:min-w-[220px]`}>
            {copyBusyLabel}
          </button>
          <button type="button" onClick={onCopyLink} className={`${adminSecondaryButtonClass} sm:min-w-[180px]`}>
            Скопировать ссылку
          </button>
        </div>

        <button
          type="button"
          onClick={onCreateAnother}
          className="text-[15px] font-semibold text-[var(--admin-accent)] hover:underline"
        >
          Создать ещё
        </button>
      </div>
    </div>
  );
}
