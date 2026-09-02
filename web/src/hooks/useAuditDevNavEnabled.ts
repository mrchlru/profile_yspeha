"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AUDIT_DEV_NAV_CHANGED_EVENT,
  readAuditDevNavEnabled,
  writeAuditDevNavEnabled,
} from "@/lib/audit/auditDevNav";
import { TEST_KIND_STATE_AUDIT_DEV } from "@/lib/access/testKinds";
import { useFormStore } from "@/store/useFormStore";

/**
 * Панель шагов аудита: только для кодов `state_audit_dev` или приглашений с `devMode`.
 * Флаг в localStorage не влияет на обычные коды (используется только в админке).
 */
export function useAuditDevNavEnabled(): boolean {
  const byInviteKind = useFormStore((s) => s.activeTestKind === TEST_KIND_STATE_AUDIT_DEV);
  const byDevInvite = useFormStore((s) => s.activeInviteDevMode);
  return byInviteKind || byDevInvite;
}

export type UseAuditDevNavEnabledResult = {
  readonly enabled: boolean;
  readonly setEnabled: (value: boolean) => void;
};

/**
 * Переключатель localStorage для локальной отладки в админ-панели (не для респондентов).
 */
export function useAuditDevNavToggle(): UseAuditDevNavEnabledResult {
  const [enabled, setLocal] = useState(false);

  useEffect(() => {
    setLocal(readAuditDevNavEnabled());

    function onChange(): void {
      setLocal(readAuditDevNavEnabled());
    }

    window.addEventListener("storage", onChange);
    window.addEventListener(AUDIT_DEV_NAV_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(AUDIT_DEV_NAV_CHANGED_EVENT, onChange);
    };
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    writeAuditDevNavEnabled(value);
    setLocal(value);
  }, []);

  return { enabled, setEnabled };
}
