"use client";

import React, { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import type { OdIdentityChallenge, OdIdentityCheckOutcome } from "@/lib/identity/odIdentityTypes";
import { evaluateOdIdentityAnswer } from "@/lib/identity/odIdentityCheck";
import { OD_IDENTITY_CHECK_TIMEOUT_MS } from "@/lib/identity/odIdentityConstants";
import { stepInputClass, stepNavPrimaryButtonClass } from "@/lib/stepPageTheme";

export type OdIdentityCheckOverlayProps = {
  challenge: OdIdentityChallenge;
  onComplete: (outcome: OdIdentityCheckOutcome) => void;
};

/**
 * Плашка проверки личности перед началом вопросов теста.
 */
export function OdIdentityCheckOverlay({
  challenge,
  onComplete,
}: OdIdentityCheckOverlayProps): React.ReactElement {
  const [textAnswer, setTextAnswer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(OD_IDENTITY_CHECK_TIMEOUT_MS / 1000)
  );
  const [finished, setFinished] = useState(false);

  const finish = useCallback(
    (outcome: OdIdentityCheckOutcome): void => {
      if (finished) {
        return;
      }
      setFinished(true);
      onComplete(outcome);
    },
    [finished, onComplete]
  );

  useEffect(() => {
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remainingMs = OD_IDENTITY_CHECK_TIMEOUT_MS - elapsed;
      setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
      if (remainingMs <= 0) {
        window.clearInterval(tick);
        finish("timeout");
      }
    }, 200);
    return () => {
      window.clearInterval(tick);
    };
  }, [finish]);

  function submitText(): void {
    const trimmed = textAnswer.trim();
    if (trimmed.length === 0) {
      finish("empty");
      return;
    }
    finish(evaluateOdIdentityAnswer(challenge, trimmed) ? "passed" : "wrong");
  }

  function submitChoice(optionId: string): void {
    finish(evaluateOdIdentityAnswer(challenge, optionId) ? "passed" : "wrong");
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="od-identity-check-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white px-6 py-6 shadow-2xl ring-1 ring-black/10">
        <p className="text-[13px] font-bold uppercase tracking-wide text-[#007A68]">
          Проверка данных
        </p>
        <h2
          id="od-identity-check-title"
          className="mt-2 text-[20px] font-extrabold text-[#3A3A3A]"
        >
          {challenge.prompt}
        </h2>
        <p className="mt-2 text-[14px] text-[#5F5E5E]">
          Ответьте на вопрос по данным из анкеты. Осталось{" "}
          <span className="font-bold text-[#C71F1F]">{secondsLeft} с</span>.
        </p>

        {challenge.mode === "text" ? (
          <div className="mt-5 space-y-4">
            <input
              type="text"
              autoFocus
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitText();
                }
              }}
              className={`${stepInputClass} h-12 w-full text-[16px]`}
            />
            <Button
              type="button"
              onClick={submitText}
              className={`${stepNavPrimaryButtonClass} w-full`}
            >
              Подтвердить
            </Button>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {(challenge.options ?? []).map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => submitChoice(option.id)}
                  className="w-full rounded-2xl border border-black/10 bg-[#F4F6F5] px-4 py-3 text-left text-[15px] font-semibold text-[#3A3A3A] transition hover:bg-[#00B596]/10 hover:ring-2 hover:ring-[#00B596]/30"
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
