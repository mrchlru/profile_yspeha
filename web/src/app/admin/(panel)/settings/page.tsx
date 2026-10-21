import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSettingsContent } from "@/components/admin/AdminSettingsContent";

export default function AdminSettingsPage(): React.ReactElement {
  return (
    <AdminShell title="Настройки">
      <AdminSettingsContent />
    </AdminShell>
  );
}
