"use client";



import React from "react";



import { useProctorBinding } from "@/hooks/useProctorBinding";

import { useProctorMonitorEnabled } from "@/hooks/useProctorIntro";

import { useScreeningProctor } from "@/hooks/useScreeningProctor";

import {

  PROCTOR_BANNER_DENIED,

  PROCTOR_BANNER_REQUESTING,

} from "@/lib/proctor/proctorCandidateMessages";

import { useProctorBannerStore } from "@/store/useProctorBannerStore";



/**

 * Фоновый мониторинг камеры и микрофона во время прохождения батареи.

 */

export function ProctorMonitor(): React.ReactElement | null {

  const enabled = useProctorMonitorEnabled();

  const bannerVisible = useProctorBannerStore((s) => s.bannerVisible);

  const { sessionId, accessCode } = useProctorBinding();



  const { status, bannerMessage, videoRef } = useScreeningProctor({

    enabled,

    sessionId,

    accessCode,

  });



  if (!enabled) {

    return null;

  }



  const bannerText =

    status === "denied"

      ? PROCTOR_BANNER_DENIED

      : status === "requesting"

        ? PROCTOR_BANNER_REQUESTING

        : bannerMessage;



  return (

    <>

      {bannerText.trim().length > 0 ? (

        <div

          className="fixed inset-x-0 top-0 z-[100] border-b border-amber-400/80 bg-amber-300/95 px-3 py-2 text-center text-[13px] font-semibold leading-snug text-amber-950 shadow-sm sm:text-[14px]"

          role="status"

          aria-live="polite"

        >

          {bannerText}

        </div>

      ) : null}



      <div

        className={`pointer-events-none fixed bottom-3 right-3 z-[90] flex flex-col items-end gap-1 ${

          bannerVisible ? "" : ""

        }`}

      >

        <span className="rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">

          Камера включена

        </span>

        <video

          ref={videoRef}

          className="h-28 w-40 rounded-xl border-2 border-amber-400/90 object-cover shadow-lg ring-1 ring-black/10"

          playsInline

          aria-label="Трансляция с вашей камеры"

        />

        {status === "denied" ? (

          <p className="max-w-[220px] rounded-lg bg-red-50 px-2 py-1 text-[11px] font-medium text-red-800 ring-1 ring-red-200">

            Нет доступа к камере или микрофону

          </p>

        ) : null}

      </div>

    </>

  );

}

