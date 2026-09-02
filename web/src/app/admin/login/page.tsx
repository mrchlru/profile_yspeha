import React, { Suspense } from "react";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage(): React.ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F2F2F2]" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
