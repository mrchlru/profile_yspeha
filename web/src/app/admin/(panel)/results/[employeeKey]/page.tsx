import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmployeeFolderView } from "@/components/admin/EmployeeFolderView";

export default function AdminEmployeeFolderPage(): React.ReactElement {
  return (
    <AdminShell
      title="Папка сотрудника"
      description="Документы, отчёты и дашборд"
    >
      <EmployeeFolderView />
    </AdminShell>
  );
}
