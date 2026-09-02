import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { ResultsBrowser } from "@/components/admin/ResultsBrowser";

export default function AdminResultsPage(): React.ReactElement {
  return (
    <AdminShell
      title="Результаты тестирования"
      description="Папки сотрудников, отчёты и дашборды"
    >
      <ResultsBrowser />
    </AdminShell>
  );
}
