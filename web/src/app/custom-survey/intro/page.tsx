"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { CustomSurveyPlayer } from "@/components/survey/CustomSurveyPlayer";
import { StepLayout } from "@/components/StepLayout";
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
  const [responseId, setResponseId] = useState<string | null>(null);
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
        setResponseId(body.responseId);
      } catch {
        setError("Сеть недоступна");
      }
    }
    void load();
  }, [hydrated, code, kind, router]);

  if (!hydrated || !schema) {
    return (
      <StepLayout>
        <div className="flex flex-1 items-center justify-center px-4 text-[#5F5E5E]">
          {error ?? "Загрузка…"}
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout>
      <div className="flex flex-1 flex-col gap-6 px-4 py-8">
        {settings?.welcomeTitle || settings?.welcomeText ? (
          <div className="mx-auto max-w-[640px] rounded-2xl border border-[#E5E5E5] bg-white p-6">
            {settings.welcomeTitle ? (
              <h1 className="text-[22px] font-extrabold text-[#1D1D1F]">{settings.welcomeTitle}</h1>
            ) : null}
            {settings.welcomeText ? (
              <p className="mt-2 text-[15px] text-[#5F5E5E]">{settings.welcomeText}</p>
            ) : null}
            <button
              type="button"
              className="mt-4 min-h-[44px] rounded-full bg-[#007A68] px-6 text-[14px] font-bold text-white"
              onClick={() => router.push("/custom-survey/take")}
            >
              Начать
            </button>
          </div>
        ) : (
          <CustomSurveyPlayer
            schema={schema}
            readOnly
          />
        )}
        {!settings?.welcomeTitle && !settings?.welcomeText ? (
          <button
            type="button"
            className="mx-auto min-h-[44px] rounded-full bg-[#007A68] px-6 text-[14px] font-bold text-white"
            onClick={() => router.push("/custom-survey/take")}
          >
            Начать опрос
          </button>
        ) : null}
        {responseId ? null : null}
      </div>
    </StepLayout>
  );
}
