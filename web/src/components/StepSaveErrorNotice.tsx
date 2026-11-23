"use client";

import React from "react";

type Props = {
  message: string | null;
  saving?: boolean;
};

/**
 * Сообщение при сохранении шага или ошибке сети.
 */
export function StepSaveErrorNotice(props: Props): React.ReactElement | null {
  if (props.saving === true) {
    return (
      <p className="mb-3 text-right text-[14px] text-[#5F5E5E]" aria-live="polite">
        Сохраняем ответы на сервере…
      </p>
    );
  }
  if (props.message === null || props.message.length === 0) {
    return null;
  }
  return (
    <p className="mb-3 text-right text-[14px] font-medium text-[#8B2E2E]" role="alert">
      {props.message}
    </p>
  );
}