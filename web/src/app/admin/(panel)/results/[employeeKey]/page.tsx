import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmployeeFolderView } from "@/components/admin/EmployeeFolderView";

export default function AdminEmployeeFolderPage(): React.ReactElement {
  return (
    <AdminShell title="">
      <EmployeeFolderView />
    </AdminShell>
  );
}
