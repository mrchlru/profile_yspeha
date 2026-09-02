"use client";

import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { PROCTOR_BANNER_DENIED } from "@/lib/proctor/proctorCandidateMessages";
import {
  ensureProctorMediaStream,
  hasActiveProctorMediaStream,
  stopProctorMediaStream,
} from "@/lib/proctor/proctorMediaStream";
import { stepNavPrimaryButtonClass, stepSecondaryTextClass } from "@/lib/stepPageTheme";
import { useFormStore } from "@/store/useFormStore";

type ProctorIntroStatus = "idle" | "requesting" | "granted" | "denied";

/**
 * Запрос камеры и микрофона на intro до начала тестирования.
 * Поток сохраняется для мониторинга на шагах теста (без повторного getUserMedia).
 */
export function ProctorIntroGate(): React.ReactElement {
  const proctorMediaGranted = useFormStore((s) => s.proctorMediaGranted);
  const setProctorMediaGranted = useFormStore((s) => s.setProctorMediaGranted);
  const [status, setStatus] = useState<ProctorIntroStatus>(
    proctorMediaGranted || hasActiveProctorMediaStream() ? "granted" : "idle"
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const grantedRef = useRef(proctorMediaGranted);

  useEffect(() => {
    grantedRef.current = proctorMediaGranted;
  }, [proctorMediaGranted]);

  useEffect(() => {
    if (!proctorMediaGranted || !hasActiveProctorMediaStream()) {
      return;
    }
    const video = videoRef.current;
    if (!video) {
      return;
    }
    void ensureProctorMediaStream().then((stream) => {
      video.srcObject = stream;
      video.muted = true;
      void video.play();
    });
  }, [proctorMediaGranted]);

  useEffect(() => {
    return () => {
      if (!grantedRef.current) {
        stopProctorMediaStream();
      }
    };
  }, []);

  async function requestAccess(): Promise<void> {
    setStatus("requesting");
    try {
      const stream = await ensureProctorMediaStream();
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        await video.play();
      }
      setProctorMediaGranted(true);
      setStatus("granted");
    } catch {
      setProctorMediaGranted(false);
      stopProctorMediaStream();
      setStatus("denied");
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/90 p-5 sm:p-6">
      <h2 className="mb-2 text-[18px] font-extrabold text-amber-950">Камера и микрофон</h2>
      <p className={`mb-4 text-[15px] ${stepSecondaryTextClass}`}>
        Перед началом тестирования нужно разрешить доступ к камере и микрофону. Вы увидите своё
        изображение — так вы поймёте, что контроль включён. Камера останется включённой на всех
        шагах теста без повторного запроса.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black shadow-md">
          <video
            ref={videoRef}
            className="h-36 w-48 object-cover"
            playsInline
            aria-label="Предпросмотр камеры"
          />
          {status !== "granted" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-3 text-center text-[13px] font-semibold text-white">
              {status === "requesting" ? "Запрос доступа…" : "Камера не подключена"}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {status === "granted" ? (
            <p className="text-[15px] font-semibold text-emerald-800" role="status">
              Камера и микрофон подключены. Можно начинать тестирование.
            </p>
          ) : null}
          {status === "denied" ? (
            <p className="text-[15px] font-semibold text-red-700" role="alert">
              {PROCTOR_BANNER_DENIED}
            </p>
          ) : null}
          {status !== "granted" ? (
            <Button
              type="button"
              onClick={() => void requestAccess()}
              disabled={status === "requesting"}
              className={stepNavPrimaryButtonClass}
            >
              {status === "requesting" ? "Подключение…" : "Разрешить камеру и микрофон"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void requestAccess()}
              className="max-w-fit"
            >
              Проверить снова
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
