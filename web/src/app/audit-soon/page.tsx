"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "@/components/StepLayout";

/**
 * Старый адрес-заглушка для аудита состояния. После запуска полноценного модуля аудита
 * (`/audit/...`) этот маршрут оставлен только ради обратной совместимости — все ссылки,
 * которые могли попасть в письма приглашений, теперь автоматически ведут на стартовый
 * экран аудита.
 */
export default function AuditSoonPage(): React.ReactElement {
  const router = useRouter();

  useEffect(() => {
    router.replace("/audit/intro");
  }, [router]);

  return (
    <StepLayout>
      <div className="flex flex-1 items-center justify-center px-4 text-[18px] text-[#5F5E5E]">
        Перенаправляем в новый раздел аудита…
      </div>
    </StepLayout>
  );
}
