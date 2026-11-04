"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { CustomSurveyPlayer } from "@/components/survey/CustomSurveyPlayer";
import { CustomSurveyRespondentLayout } from "@/components/survey/CustomSurveyRespondentLayout";
import { isCustomSurveyTestKind } from "@/lib/access/testKinds";
import { useFormStoreHydrated } from "@/hooks/useAccessGate";
import { useFormStore } from "@/store/useFormStore";
import type { SurveySchemaDocument } from "@/lib/survey/surveyTypes";

/**
 * Прохождение собственного опроса по коду доступа.
 */
export default function CustomSurveyTakePage(): React.ReactElement {
  const router = useRouter();
  const hydrated = useFormStoreHydrated();
  const code = useFormStore((s) => s.validatedAccessCode);
  const kind = useFormStore((s) => s.activeTestKind);
  const [schema, setSchema] = useState<SurveySchemaDocument | null>(null);
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
          responseId?: string;
          error?: string;
        };
        if (!res.ok || !body.schema || !body.responseId) {
          setError(body.error ?? "Не удалось загрузить опрос");
          return;
        }
        setSchema(body.schema);
        setResponseId(body.responseId);
      } catch {
        setError("Сеть недоступна");
      }
    }
    void load();
  }, [hydrated, code, kind, router]);

  async function submitAnswers(
    answers: Array<{ questionId: string; value: unknown }>
  ): Promise<void> {
    if (!code || !responseId) {
      return;
    }
    const res = await fetch("/api/survey/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, responseId, answers }),
    });
    if (!res.ok) {
      throw new Error("submit_failed");
    }
  }

  return (
    <CustomSurveyRespondentLayout>
      {error ? (
        <p className="text-center text-[15px] text-red-700">{error}</p>
      ) : schema ? (
        <CustomSurveyPlayer schema={schema} onSubmit={submitAnswers} />
      ) : (
        <p className="text-center text-[#5F5E5E]">Загрузка…</p>
      )}
    </CustomSurveyRespondentLayout>
  );
}
