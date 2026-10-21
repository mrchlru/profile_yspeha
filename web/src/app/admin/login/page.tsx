import React, { Suspense } from "react";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage(): React.ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--admin-bg)]" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
