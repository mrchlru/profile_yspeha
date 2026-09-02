import React from "react";

import type { AdminNavIconId } from "@/lib/admin/adminNav";

type AdminNavIconProps = {
  iconId: AdminNavIconId;
};

/**
 * Иконка пункта бокового меню админ-панели.
 */
export function AdminNavIcon({ iconId }: AdminNavIconProps): React.ReactElement {
  switch (iconId) {
    case "create-test":
      return <CreateTestNavIcon />;
    case "interview":
      return <InterviewNavIcon />;
    case "invitations":
      return <InvitationsNavIcon />;
    case "results":
      return <ResultsNavIcon />;
    case "settings":
      return <SettingsNavIcon />;
    case "institutions":
      return <InstitutionsNavIcon />;
  }
}

function NavIconSvg({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Создать тестирование — бумага с плюсом. */
function CreateTestNavIcon(): React.ReactElement {
  return (
    <NavIconSvg>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 18v-6" />
      <path d="M9 15h6" />
    </NavIconSvg>
  );
}

/** Собеседование — два участника. */
function InterviewNavIcon(): React.ReactElement {
  return (
    <NavIconSvg>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </NavIconSvg>
  );
}

/** Статус приглашений — конверт. */
function InvitationsNavIcon(): React.ReactElement {
  return (
    <NavIconSvg>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </NavIconSvg>
  );
}

/** Результаты тестирования — столбчатая диаграмма. */
function ResultsNavIcon(): React.ReactElement {
  return (
    <NavIconSvg>
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </NavIconSvg>
  );
}

/** Настройки — шестерёнка. */
function SettingsNavIcon(): React.ReactElement {
  return (
    <NavIconSvg>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </NavIconSvg>
  );
}

/** Учебные заведения — здание. */
function InstitutionsNavIcon(): React.ReactElement {
  return (
    <NavIconSvg>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-4h6v4" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M9 14h.01" />
      <path d="M15 14h.01" />
    </NavIconSvg>
  );
}
