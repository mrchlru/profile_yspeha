import React, { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { ProfSbEducationReportViewer } from "@/components/admin/ProfSbEducationReportViewer";

/**
 * Страница просмотра результата анкеты ПРОФ СБ + ПРОФ образование.
 */
export default function ProfSbEducationReportPage(): React.ReactElement {
  return (
    <AdminShell
      title="ПРОФ СБ + ПРОФ образование"
      description="Анкета ПРОФ СБ и блок профессионального образования"
    >
      <Suspense fallback={<p className="text-[#8C8C8C]">Загрузка…</p>}>
        <ProfSbEducationReportViewer />
      </Suspense>
    </AdminShell>
  );
}
