import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { InterviewFoldersBrowser } from "@/components/admin/InterviewFoldersBrowser";

export default function AdminInterviewPage(): React.ReactElement {
  return (
    <AdminShell
      title="Собеседование"
      description="Папки вакансий: должность и дата первого скрининга"
    >
      <InterviewFoldersBrowser />
    </AdminShell>
  );
}
