import React, { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { InterviewFoldersBrowser } from "@/components/admin/InterviewFoldersBrowser";

export default function AdminInterviewPage(): React.ReactElement {
  return (
    <AdminShell title="Собеседование">
      <Suspense fallback={null}>
        <InterviewFoldersBrowser />
      </Suspense>
    </AdminShell>
  );
}
