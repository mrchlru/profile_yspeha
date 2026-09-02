"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import {
  PROCTOR_BANNER_ALL_CLEAR,
  PROCTOR_BANNER_DENIED,
  PROCTOR_BANNER_HIDDEN,
  PROCTOR_BANNER_REQUESTING,
  proctorCandidateMessageForKind,
} from "@/lib/proctor/proctorCandidateMessages";
import {
  PROCTOR_EVENT_AUDIO_NOISE,
  PROCTOR_EVENT_FACE_MISSING,
  PROCTOR_EVENT_GAZE_AWAY,
  PROCTOR_EVENT_MULTIPLE_FACES,
  PROCTOR_EVENT_PHONE_DETECTED,
  isProctorEventKind,
  type ClientProctorEventKind,
  type ProctorEventKind,
} from "@/lib/proctor/proctorEventKinds";
import { createProctorFaceLandmarker } from "@/lib/proctor/proctorFaceLandmarker";
import {
  ensureProctorMediaStream,
  stopProctorMediaStream,
} from "@/lib/proctor/proctorMediaStream";
import { GAZE_AWAY_STREAK, isGazeAwayFromScreen } from "@/lib/proctor/headPoseAnalysis";
import { proctorStepMetadata } from "@/lib/proctor/proctorStepContext";
import { useProctorBannerStore } from "@/store/useProctorBannerStore";

export type ScreeningProctorStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "error";

type PendingProctorEvent = {
  clientEventId: string;
  kind: ClientProctorEventKind;
  occurredAt: string;
  clientFaceCount?: number;
  metadata?: Record<string, unknown>;
};

type UseScreeningProctorOptions = {
  enabled: boolean;
  sessionId: string | null;
  accessCode: string | null;
};

type UseScreeningProctorResult = {
  status: ScreeningProctorStatus;
  bannerMessage: string;
  videoRef: RefObject<HTMLVideoElement>;
};

const FACE_SAMPLE_MS = 1000;
const FACE_MISSING_STREAK = 2;
const PERIODIC_SCAN_MS = 12_000;
/** После снятия нарушения полоса ещё 5 с; новое краткое уведомление заменяет предыдущее. */
const BANNER_LINGER_MS = 5_000;
/** Приоритет сообщений, если активно несколько нарушений (выше — важнее). */
const BANNER_KIND_PRIORITY: ReadonlyArray<ProctorEventKind> = [
  PROCTOR_EVENT_MULTIPLE_FACES,
  PROCTOR_EVENT_FACE_MISSING,
  PROCTOR_EVENT_PHONE_DETECTED,
  PROCTOR_EVENT_AUDIO_NOISE,
  PROCTOR_EVENT_GAZE_AWAY,
];
const EVENT_COOLDOWN_MS: Record<ClientProctorEventKind, number> = {
  face_missing: 12_000,
  multiple_faces: 12_000,
  audio_noise: 8_000,
  gaze_away: 15_000,
};
/** Порог RMS (выше = менее чувствительно к щелчкам и фоновому шуму). */
const AUDIO_RMS_THRESHOLD = 0.072;
const AUDIO_SUSTAIN_MS = 750;
const AUDIO_QUIET_MS = 1400;
const AUDIO_RMS_SMOOTHING = 0.88;
const SNAPSHOT_JPEG_QUALITY = 0.72;
const AUDIO_SLICE_MS = 1000;
const AUDIO_ROLLING_SLICES = 4;
const MAX_AUDIO_CLIP_MS = 45_000;
const MAX_SESSION_AUDIO_BYTES = 10 * 1024 * 1024;

type FaceVideoState = "ok" | "missing" | "multiple";

/**
 * Гибридный прокторинг: лица в браузере, YOLO на сервере, непрерывная запись звука.
 */
export function useScreeningProctor(options: UseScreeningProctorOptions): UseScreeningProctorResult {
  const { enabled, sessionId, accessCode } = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<ScreeningProctorStatus>("idle");
  const [bannerMessage, setBannerMessage] = useState<string>(PROCTOR_BANNER_HIDDEN);
  const setBannerVisible = useProctorBannerStore((s) => s.setBannerVisible);

  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<{
    analyzeVideo: (
      video: HTMLVideoElement,
      ts: number
    ) => { faceCount: number; headPose: { yaw: number; pitch: number; roll: number } | null };
  } | null>(null);
  const pendingEventsRef = useRef<PendingProctorEvent[]>([]);
  const flushInFlightRef = useRef(false);
  const lastEventAtRef = useRef<Partial<Record<ClientProctorEventKind, number>>>({});
  const zeroFaceStreakRef = useRef(0);
  const gazeAwayStreakRef = useRef(0);
  const gazeStateRef = useRef<"ok" | "away">("ok");
  const audioHighSinceRef = useRef<number | null>(null);
  const audioQuietSinceRef = useRef<number | null>(null);
  const audioNoisyRef = useRef(false);
  const audioRmsSmoothedRef = useRef(0);
  const sessionRegisteredRef = useRef(false);
  const bannerHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faceStateRef = useRef<FaceVideoState>("ok");
  const sessionStartedAtRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const rollingAudioRef = useRef<Blob[]>([]);
  const sessionAudioChunksRef = useRef<Blob[]>([]);
  const clipAudioRef = useRef<Blob[]>([]);
  const clipStartedAtRef = useRef<number | null>(null);
  const clipEventIdRef = useRef<string | null>(null);
  const recordingClipRef = useRef(false);
  const sessionAudioUploadInFlightRef = useRef(false);

  const sessionIdRef = useRef(sessionId);
  const accessCodeRef = useRef(accessCode);
  sessionIdRef.current = sessionId;
  accessCodeRef.current = accessCode;

  const setBanner = useCallback(
    (message: string): void => {
      setBannerMessage(message);
      setBannerVisible(message.trim().length > 0);
    },
    [setBannerVisible]
  );

  const clearBannerHideTimer = useCallback((): void => {
    if (bannerHideTimerRef.current) {
      clearTimeout(bannerHideTimerRef.current);
      bannerHideTimerRef.current = null;
    }
  }, []);

  const getHighestPriorityOngoingKind = useCallback((): ProctorEventKind | null => {
    const active: ProctorEventKind[] = [];
    if (faceStateRef.current === "multiple") {
      active.push(PROCTOR_EVENT_MULTIPLE_FACES);
    }
    if (faceStateRef.current === "missing") {
      active.push(PROCTOR_EVENT_FACE_MISSING);
    }
    if (audioNoisyRef.current) {
      active.push(PROCTOR_EVENT_AUDIO_NOISE);
    }
    if (gazeStateRef.current === "away") {
      active.push(PROCTOR_EVENT_GAZE_AWAY);
    }
    for (const kind of BANNER_KIND_PRIORITY) {
      if (active.includes(kind)) {
        return kind;
      }
    }
    return null;
  }, []);

  const syncPersistentBanner = useCallback((): void => {
    const kind = getHighestPriorityOngoingKind();
    if (kind === null) {
      return;
    }
    clearBannerHideTimer();
    setBanner(proctorCandidateMessageForKind(kind));
  }, [clearBannerHideTimer, getHighestPriorityOngoingKind, setBanner]);

  const scheduleBannerHide = useCallback(
    (delayMs: number = BANNER_LINGER_MS): void => {
      clearBannerHideTimer();
      bannerHideTimerRef.current = setTimeout(() => {
        const ongoing = getHighestPriorityOngoingKind();
        if (ongoing !== null) {
          syncPersistentBanner();
          return;
        }
        setBanner(PROCTOR_BANNER_HIDDEN);
        bannerHideTimerRef.current = null;
      }, delayMs);
    },
    [clearBannerHideTimer, getHighestPriorityOngoingKind, setBanner, syncPersistentBanner]
  );

  /** Краткое уведомление (5 с), если нет более приоритетного активного нарушения. */
  const showTransientBanner = useCallback(
    (kind: ProctorEventKind): void => {
      const ongoing = getHighestPriorityOngoingKind();
      if (ongoing !== null) {
        const ongoingRank = BANNER_KIND_PRIORITY.indexOf(ongoing);
        const kindRank = BANNER_KIND_PRIORITY.indexOf(kind);
        if (ongoingRank >= 0 && kindRank >= 0 && ongoingRank <= kindRank) {
          syncPersistentBanner();
          return;
        }
      }
      clearBannerHideTimer();
      setBanner(proctorCandidateMessageForKind(kind));
      scheduleBannerHide(BANNER_LINGER_MS);
    },
    [
      clearBannerHideTimer,
      getHighestPriorityOngoingKind,
      scheduleBannerHide,
      setBanner,
      syncPersistentBanner,
    ]
  );

  /** Обновляет полосу после изменения состояния (активное нарушение или 5 с «всё ок»). */
  const refreshBannerAfterStateChange = useCallback((): void => {
    const ongoing = getHighestPriorityOngoingKind();
    if (ongoing !== null) {
      syncPersistentBanner();
      return;
    }
    setBanner(PROCTOR_BANNER_ALL_CLEAR);
    scheduleBannerHide(BANNER_LINGER_MS);
  }, [getHighestPriorityOngoingKind, scheduleBannerHide, setBanner, syncPersistentBanner]);

  const showViolationBanner = useCallback(
    (kind: ProctorEventKind): void => {
      const isOngoingPersistent =
        (kind === PROCTOR_EVENT_AUDIO_NOISE && audioNoisyRef.current) ||
        (kind === PROCTOR_EVENT_GAZE_AWAY && gazeStateRef.current === "away") ||
        (kind === PROCTOR_EVENT_FACE_MISSING && faceStateRef.current === "missing") ||
        (kind === PROCTOR_EVENT_MULTIPLE_FACES && faceStateRef.current === "multiple");

      if (isOngoingPersistent) {
        syncPersistentBanner();
        return;
      }
      showTransientBanner(kind);
    },
    [showTransientBanner, syncPersistentBanner]
  );

  const captureSnapshotBlob = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.drawImage(video, 0, 0);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", SNAPSHOT_JPEG_QUALITY);
    });
  }, []);

  const uploadSnapshot = useCallback(async (serverEventId: string, blob: Blob): Promise<void> => {
    const sid = sessionIdRef.current;
    const code = accessCodeRef.current;
    if (!sid || !code) {
      return;
    }
    const video = videoRef.current;
    const formData = new FormData();
    formData.set("sessionId", sid);
    formData.set("accessCode", code);
    formData.set("serverEventId", serverEventId);
    if (video) {
      formData.set("width", String(video.videoWidth));
      formData.set("height", String(video.videoHeight));
    }
    formData.set("snapshot", blob, "snapshot.jpg");
    await fetch("/api/proctor/snapshot", { method: "POST", body: formData });
  }, []);

  const uploadAudioClip = useCallback(
    async (serverEventId: string, blob: Blob, durationMs: number): Promise<void> => {
      const sid = sessionIdRef.current;
      const code = accessCodeRef.current;
      if (!sid || !code) {
        return;
      }
      const formData = new FormData();
      formData.set("sessionId", sid);
      formData.set("accessCode", code);
      formData.set("serverEventId", serverEventId);
      formData.set("durationMs", String(durationMs));
      formData.set("audio", blob, "clip.webm");
      await fetch("/api/proctor/audio", { method: "POST", body: formData });
    },
    []
  );

  const uploadSessionAudio = useCallback(async (final: boolean): Promise<void> => {
    const sid = sessionIdRef.current;
    const code = accessCodeRef.current;
    if (!sid || !code || sessionAudioUploadInFlightRef.current) {
      return;
    }
    const chunks = sessionAudioChunksRef.current;
    if (chunks.length === 0) {
      return;
    }
    const blob = new Blob(chunks, { type: "audio/webm" });
    if (blob.size === 0 || blob.size > MAX_SESSION_AUDIO_BYTES) {
      return;
    }

    sessionAudioUploadInFlightRef.current = true;
    try {
      const formData = new FormData();
      formData.set("sessionId", sid);
      formData.set("accessCode", code);
      formData.set("final", final ? "1" : "0");
      const startedAt = sessionStartedAtRef.current;
      if (startedAt !== null) {
        formData.set("durationMs", String(Math.max(0, Date.now() - startedAt)));
      }
      formData.set("audio", blob, "session.webm");
      await fetch("/api/proctor/session-audio", { method: "POST", body: formData });
    } finally {
      sessionAudioUploadInFlightRef.current = false;
    }
  }, []);

  const finalizeAudioClip = useCallback(async (): Promise<void> => {
    const eventId = clipEventIdRef.current;
    const startedAt = clipStartedAtRef.current;
    if (!eventId || !recordingClipRef.current) {
      recordingClipRef.current = false;
      clipAudioRef.current = [];
      clipEventIdRef.current = null;
      clipStartedAtRef.current = null;
      return;
    }

    const chunks = [...clipAudioRef.current];
    recordingClipRef.current = false;
    clipAudioRef.current = [];
    clipEventIdRef.current = null;
    clipStartedAtRef.current = null;

    if (chunks.length === 0) {
      return;
    }

    const blob = new Blob(chunks, { type: "audio/webm" });
    const durationMs = startedAt ? Math.max(0, Date.now() - startedAt) : null;
    await uploadAudioClip(eventId, blob, durationMs ?? blob.size);
  }, [uploadAudioClip]);

  const beginAudioClip = useCallback((serverEventId: string): void => {
    if (recordingClipRef.current) {
      return;
    }
    recordingClipRef.current = true;
    clipEventIdRef.current = serverEventId;
    clipStartedAtRef.current = Date.now();
    clipAudioRef.current = [...rollingAudioRef.current];
  }, []);

  const flushEventsRef = useRef<() => Promise<Map<string, string>>>(() =>
    Promise.resolve(new Map())
  );

  const flushEvents = useCallback(async (): Promise<Map<string, string>> => {
    const createdIds = new Map<string, string>();
    const sid = sessionIdRef.current;
    const code = accessCodeRef.current;
    if (flushInFlightRef.current || !sid || !code || pendingEventsRef.current.length === 0) {
      return createdIds;
    }

    flushInFlightRef.current = true;
    const batch = pendingEventsRef.current.splice(0, 20);

    try {
      if (!sessionRegisteredRef.current) {
        await fetch("/api/proctor/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid, accessCode: code }),
        });
        sessionRegisteredRef.current = true;
      }

      const res = await fetch("/api/proctor/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, accessCode: code, events: batch }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        events?: ReadonlyArray<{
          clientEventId: string;
          serverEventId: string;
          needsSnapshot: boolean;
        }>;
      };

      if (!res.ok || !body.events) {
        pendingEventsRef.current.unshift(...batch);
        return createdIds;
      }

      for (const item of body.events) {
        createdIds.set(item.clientEventId, item.serverEventId);
        if (!item.needsSnapshot) {
          continue;
        }
        const blob = await captureSnapshotBlob();
        if (blob) {
          void uploadSnapshot(item.serverEventId, blob);
        }
      }
    } catch {
      pendingEventsRef.current.unshift(...batch);
    } finally {
      flushInFlightRef.current = false;
    }

    return createdIds;
  }, [captureSnapshotBlob, uploadSnapshot]);

  flushEventsRef.current = flushEvents;

  const stopSessionRecorder = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve();
        return;
      }
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });
  }, []);

  const enqueueEventRef = useRef<
    (
      kind: ClientProctorEventKind,
      clientFaceCount?: number,
      metadata?: Record<string, unknown>
    ) => string | null
  >(() => null);

  enqueueEventRef.current = (
    kind: ClientProctorEventKind,
    clientFaceCount?: number,
    metadata?: Record<string, unknown>
  ): string | null => {
    const now = Date.now();
    const lastAt = lastEventAtRef.current[kind] ?? 0;
    if (now - lastAt < EVENT_COOLDOWN_MS[kind]) {
      showViolationBanner(kind);
      return null;
    }
    lastEventAtRef.current[kind] = now;

    const clientEventId = crypto.randomUUID();
    const stepMeta = proctorStepMetadata();
    const mergedMetadata =
      stepMeta !== undefined
        ? metadata !== undefined
          ? { ...stepMeta, ...metadata }
          : stepMeta
        : metadata;
    pendingEventsRef.current.push({
      clientEventId,
      kind,
      occurredAt: new Date().toISOString(),
      clientFaceCount,
      metadata: mergedMetadata,
    });
    showViolationBanner(kind);
    void flushEventsRef.current();
    return clientEventId;
  };

  const runPeriodicScan = useCallback(async (): Promise<void> => {
    const sid = sessionIdRef.current;
    const code = accessCodeRef.current;
    if (!sid || !code) {
      return;
    }
    const blob = await captureSnapshotBlob();
    if (!blob) {
      return;
    }
    const video = videoRef.current;
    const formData = new FormData();
    formData.set("sessionId", sid);
    formData.set("accessCode", code);
    if (video) {
      formData.set("width", String(video.videoWidth));
      formData.set("height", String(video.videoHeight));
    }
    formData.set("snapshot", blob, "scan.jpg");
    const stepMeta = proctorStepMetadata();
    if (stepMeta?.stepLabel) {
      formData.set("stepLabel", stepMeta.stepLabel);
    }
    if (stepMeta?.routePath) {
      formData.set("routePath", stepMeta.routePath);
    }

    try {
      const res = await fetch("/api/proctor/scan", { method: "POST", body: formData });
      const body = (await res.json()) as {
        ok?: boolean;
        violations?: ReadonlyArray<{ kind: string; serverEventId: string }>;
      };
      if (!res.ok || !body.violations) {
        return;
      }
      for (const violation of body.violations) {
        if (!isProctorEventKind(violation.kind)) {
          continue;
        }
        if (violation.kind === PROCTOR_EVENT_FACE_MISSING) {
          faceStateRef.current = "missing";
        } else if (violation.kind === PROCTOR_EVENT_MULTIPLE_FACES) {
          faceStateRef.current = "multiple";
        }
        if (violation.kind === PROCTOR_EVENT_PHONE_DETECTED) {
          showTransientBanner(violation.kind);
        } else {
          syncPersistentBanner();
        }
      }
    } catch {
      /* игнорируем сбой скана */
    }
  }, [captureSnapshotBlob, showTransientBanner, syncPersistentBanner]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setBanner(PROCTOR_BANNER_HIDDEN);
    }
  }, [enabled, setBanner]);

  useEffect(() => {
    if (!enabled) {
      stopProctorMediaStream();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !sessionId || !accessCode) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let faceTimer: ReturnType<typeof setInterval> | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    let scanTimer: ReturnType<typeof setInterval> | null = null;
    let audioFrame = 0;

    async function start(): Promise<void> {
      setStatus("requesting");
      setBanner(PROCTOR_BANNER_REQUESTING);
      sessionStartedAtRef.current = Date.now();

      try {
        const stream = await ensureProctorMediaStream();
        if (cancelled) {
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          await video.play();
        }

        faceLandmarkerRef.current = await createProctorFaceLandmarker();

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          const audioStream = new MediaStream([audioTrack]);
          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";
          const recorder = new MediaRecorder(audioStream, { mimeType });
          recorder.ondataavailable = (event) => {
            if (event.data.size === 0) {
              return;
            }
            rollingAudioRef.current.push(event.data);
            if (rollingAudioRef.current.length > AUDIO_ROLLING_SLICES) {
              rollingAudioRef.current.shift();
            }
            sessionAudioChunksRef.current.push(event.data);
            const sessionSize = sessionAudioChunksRef.current.reduce(
              (sum, chunk) => sum + chunk.size,
              0
            );
            if (sessionSize > MAX_SESSION_AUDIO_BYTES) {
              sessionAudioChunksRef.current.shift();
            }
            if (recordingClipRef.current) {
              clipAudioRef.current.push(event.data);
              const startedAt = clipStartedAtRef.current;
              if (startedAt && Date.now() - startedAt > MAX_AUDIO_CLIP_MS) {
                void finalizeAudioClip();
              }
            }
          };
          recorder.start(AUDIO_SLICE_MS);
          mediaRecorderRef.current = recorder;
        }

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);

        function sampleAudio(): void {
          if (cancelled) {
            return;
          }
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i += 1) {
            const normalized = (data[i]! - 128) / 128;
            sum += normalized * normalized;
          }
          const rms = Math.sqrt(sum / data.length);
          audioRmsSmoothedRef.current =
            audioRmsSmoothedRef.current * AUDIO_RMS_SMOOTHING + rms * (1 - AUDIO_RMS_SMOOTHING);
          const now = performance.now();
          const noisy = audioRmsSmoothedRef.current >= AUDIO_RMS_THRESHOLD;

          if (noisy) {
            audioQuietSinceRef.current = null;
            if (audioHighSinceRef.current === null) {
              audioHighSinceRef.current = now;
            } else if (now - audioHighSinceRef.current >= AUDIO_SUSTAIN_MS) {
              if (!audioNoisyRef.current) {
                audioNoisyRef.current = true;
                const clientEventId = enqueueEventRef.current(PROCTOR_EVENT_AUDIO_NOISE);
                if (clientEventId) {
                  void flushEvents().then((map) => {
                    const serverEventId = map.get(clientEventId);
                    if (serverEventId) {
                      beginAudioClip(serverEventId);
                    }
                  });
                }
              }
              showViolationBanner(PROCTOR_EVENT_AUDIO_NOISE);
            }
          } else {
            audioHighSinceRef.current = null;
            if (audioNoisyRef.current) {
              if (audioQuietSinceRef.current === null) {
                audioQuietSinceRef.current = now;
              } else if (now - audioQuietSinceRef.current >= AUDIO_QUIET_MS) {
                audioNoisyRef.current = false;
                audioQuietSinceRef.current = null;
                void finalizeAudioClip();
                refreshBannerAfterStateChange();
              }
            }
          }

          audioFrame = requestAnimationFrame(sampleAudio);
        }
        audioFrame = requestAnimationFrame(sampleAudio);

        faceTimer = setInterval(() => {
          const videoEl = videoRef.current;
          const landmarker = faceLandmarkerRef.current;
          if (!videoEl || !landmarker || videoEl.readyState < 2) {
            return;
          }
          const analysis = landmarker.analyzeVideo(videoEl, performance.now());
          const count = analysis.faceCount;

          if (count === 0) {
            zeroFaceStreakRef.current += 1;
            gazeAwayStreakRef.current = 0;
            gazeStateRef.current = "ok";
            faceStateRef.current = "missing";
            showViolationBanner(PROCTOR_EVENT_FACE_MISSING);
            if (zeroFaceStreakRef.current >= FACE_MISSING_STREAK) {
              enqueueEventRef.current(PROCTOR_EVENT_FACE_MISSING, 0);
              zeroFaceStreakRef.current = 0;
            }
          } else if (count >= 2) {
            zeroFaceStreakRef.current = 0;
            gazeAwayStreakRef.current = 0;
            gazeStateRef.current = "ok";
            faceStateRef.current = "multiple";
            showViolationBanner(PROCTOR_EVENT_MULTIPLE_FACES);
            enqueueEventRef.current(PROCTOR_EVENT_MULTIPLE_FACES, count);
          } else {
            zeroFaceStreakRef.current = 0;
            if (faceStateRef.current !== "ok") {
              faceStateRef.current = "ok";
              refreshBannerAfterStateChange();
            }
            const pose = analysis.headPose;
            if (pose !== null && isGazeAwayFromScreen(pose)) {
              gazeAwayStreakRef.current += 1;
              gazeStateRef.current = "away";
              showViolationBanner(PROCTOR_EVENT_GAZE_AWAY);
              if (gazeAwayStreakRef.current >= GAZE_AWAY_STREAK) {
                enqueueEventRef.current(PROCTOR_EVENT_GAZE_AWAY, 1, {
                  headYawDeg: Math.round(pose.yaw),
                  headPitchDeg: Math.round(pose.pitch),
                  headRollDeg: Math.round(pose.roll),
                });
                gazeAwayStreakRef.current = 0;
              }
            } else {
              gazeAwayStreakRef.current = 0;
              if (gazeStateRef.current !== "ok") {
                gazeStateRef.current = "ok";
                refreshBannerAfterStateChange();
              }
            }
          }
        }, FACE_SAMPLE_MS);

        flushTimer = setInterval(() => {
          void flushEvents();
        }, 4000);

        scanTimer = setInterval(() => {
          void runPeriodicScan();
        }, PERIODIC_SCAN_MS);

        void runPeriodicScan();

        setStatus("active");
        setBanner(PROCTOR_BANNER_HIDDEN);
      } catch {
        setStatus("denied");
        setBanner(PROCTOR_BANNER_DENIED);
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (faceTimer) clearInterval(faceTimer);
      if (flushTimer) clearInterval(flushTimer);
      if (scanTimer) clearInterval(scanTimer);
      if (bannerHideTimerRef.current) {
        clearTimeout(bannerHideTimerRef.current);
        bannerHideTimerRef.current = null;
      }
      cancelAnimationFrame(audioFrame);
      void (async () => {
        await stopSessionRecorder();
        mediaRecorderRef.current = null;
        await finalizeAudioClip();
        await uploadSessionAudio(true);
        await flushEvents();
      })();
      streamRef.current = null;
      faceLandmarkerRef.current = null;
      setBanner(PROCTOR_BANNER_HIDDEN);
    };
    // Колбэки в refs — перезапуск только при смене сессии, не при каждом рендере.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable media across step navigation
  }, [enabled, sessionId, accessCode]);

  return { status, bannerMessage, videoRef };
}
