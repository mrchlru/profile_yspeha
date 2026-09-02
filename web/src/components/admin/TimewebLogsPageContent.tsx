"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

import { TimewebLogsViewer } from "@/components/admin/TimewebLogsViewer";
import { ADMIN_ROLE_ADMIN } from "@/lib/admin/adminRoles";
import { useAdminSession } from "@/hooks/useAdminSession";

/**
 * Обёртка страницы логов Timeweb: доступ только главному администратору.
 */
export function TimewebLogsPageContent(): React.ReactElement {
  const router = useRouter();
  const { session } = useAdminSession();

  useEffect(() => {
    if (session.status === "authenticated" && session.role !== ADMIN_ROLE_ADMIN) {
      router.replace("/admin");
    }
  }, [session, router]);

  if (session.status !== "authenticated") {
    return <p className="text-[#5F5E5E]">Загрузка…</p>;
  }

  if (session.role !== ADMIN_ROLE_ADMIN) {
    return <p className="text-[#5F5E5E]">Недостаточно прав</p>;
  }

  return <TimewebLogsViewer />;
}
