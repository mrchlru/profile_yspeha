import React, { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { InterviewFolderDetailView } from "@/components/admin/InterviewFolderDetailView";

export default function AdminInterviewFolderPage(): React.ReactElement {
  return (
    <AdminShell title="Папка вакансии" description="Кандидаты и решения по собеседованию">
      <Suspense fallback={<p className="text-[#8C8C8C]">Загрузка…</p>}>
        <InterviewFolderDetailView />
      </Suspense>
    </AdminShell>
  );
}
