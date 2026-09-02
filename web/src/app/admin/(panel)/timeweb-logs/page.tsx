import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { TimewebLogsPageContent } from "@/components/admin/TimewebLogsPageContent";

export default function AdminTimewebLogsPage(): React.ReactElement {
  return (
    <AdminShell
      title="Логи Timeweb"
      description="Runtime и deploy логи приложения на Timeweb Cloud"
    >
      <TimewebLogsPageContent />
    </AdminShell>
  );
}
