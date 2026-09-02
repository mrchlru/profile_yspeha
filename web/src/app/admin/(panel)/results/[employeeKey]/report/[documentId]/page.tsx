import React, { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmployeeReportViewer } from "@/components/admin/EmployeeReportViewer";

export default function AdminEmployeeReportPage(): React.ReactElement {
  return (
    <AdminShell title="Просмотр отчёта" description="Отчёт сотрудника в приложении">
      <Suspense fallback={<p className="text-[#8C8C8C]">Загрузка отчёта…</p>}>
        <EmployeeReportViewer />
      </Suspense>
    </AdminShell>
  );
}
