"use client";

import { useEffect } from "react";

import { applyAccessValidateOkBody } from "@/lib/access/applyAccessValidateOkBody";

type UseSyncAccessInviteFromValidateOptions = {
  accessReady: boolean;
  validatedAccessCode: string | null;
  /** Вызывается, если validate вернул ошибку (код недействителен). */
  onInvalid?: () => void;
};

/**
 * Подтягивает с сервера актуальные флаги приглашения (в т.ч. отключение камеры).
 * Нужен при возврате по сохранённому коду — localStorage может устареть.
 */
export function useSyncAccessInviteFromValidate(
  options: UseSyncAccessInviteFromValidateOptions
): void {
  const { accessReady, validatedAccessCode, onInvalid } = options;

  useEffect(() => {
    if (!accessReady || !validatedAccessCode) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/access/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: validatedAccessCode }),
      });
      const body = (await res.json()) as {
        avProctorDisabled?: boolean;
        devMode?: boolean;
        candidateFirstName?: string;
        candidateLastName?: string;
        error?: string;
      };
      if (cancelled) {
        return;
      }
      if (res.ok) {
        applyAccessValidateOkBody(body);
        return;
      }
      onInvalid?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [accessReady, validatedAccessCode, onInvalid]);
}
