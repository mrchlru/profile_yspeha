"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { CustomSurveyRespondentLayout } from "@/components/survey/CustomSurveyRespondentLayout";
import { isCustomSurveyTestKind } from "@/lib/access/testKinds";
import { useFormStore } from "@/store/useFormStore";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import type { SurveySchemaDocument, SurveySettingsDocument } from "@/lib/survey/surveyTypes";

/**
 * Приветствие перед прохождением собственного опроса.
 */
export default function CustomSurveyIntroPage(): React.ReactElement {
  const router = useRouter();
  const hydrated = useFormStoreHydrated();
  const code = useFormStore((s) => s.validatedAccessCode);
  const kind = useFormStore((s) => s.activeTestKind);
  const [schema, setSchema] = useState<SurveySchemaDocument | null>(null);
  const [settings, setSettings] = useState<SurveySettingsDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!code || !isCustomSurveyTestKind(kind)) {
      router.replace("/");
      return;
    }
    async function load(): Promise<void> {
      try {
        const res = await fetch("/api/survey/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const body = (await res.json()) as {
          schema?: SurveySchemaDocument;
          settings?: SurveySettingsDocument;
          responseId?: string;
          error?: string;
        };
        if (!res.ok || !body.schema || !body.responseId) {
          setError(body.error ?? "Не удалось загрузить опрос");
          return;
        }
        setSchema(body.schema);
        setSettings(body.settings ?? null);
      } catch {
        setError("Сеть недоступна");
      }
    }
    void load();
  }, [hydrated, code, kind, router]);

  const welcomeTitle =
    settings?.welcomeTitle?.trim() || schema?.title?.trim() || "Опрос";

  if (!hydrated || !schema) {
    return (
      <CustomSurveyRespondentLayout>
        <p className="text-center text-[#5F5E5E]">{error ?? "Загрузка…"}</p>
      </CustomSurveyRespondentLayout>
    );
  }

  return (
    <CustomSurveyRespondentLayout>
      <div className="mx-auto max-w-[720px] rounded-2xl border border-[#E5E5E5] border-t-[10px] border-t-[#007A68] bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-[28px] font-extrabold text-[#1D1D1F] sm:text-[32px]">{welcomeTitle}</h1>
        {schema.description ? (
          <p className="mt-3 text-[16px] leading-relaxed text-[#5F5E5E]">{schema.description}</p>
        ) : null}
        {settings?.welcomeText ? (
          <p className="mt-3 text-[16px] leading-relaxed text-[#5F5E5E]">{settings.welcomeText}</p>
        ) : null}
        <button
          type="button"
          className="mt-8 min-h-[52px] rounded-full bg-[#007A68] px-10 text-[16px] font-bold text-white"
          onClick={() => router.push("/custom-survey/take")}
        >
          Начать опрос
        </button>
      </div>
    </CustomSurveyRespondentLayout>
  );
}
