/** Углы головы в градусах (yaw — поворот влево/вправо, pitch — вверх/вниз). */
export type HeadPoseDegrees = {
  yaw: number;
  pitch: number;
  roll: number;
};

export type NormalizedLandmark = {
  x: number;
  y: number;
  z?: number;
};

/** Порог поворота головы влево/вправо (градусы). */
export const GAZE_YAW_THRESHOLD_DEG = 28;

/** Порог наклона головы вверх/вниз (градусы). */
export const GAZE_PITCH_THRESHOLD_DEG = 32;

/** Сколько подряд секунд «взгляд в сторону» перед событием. */
export const GAZE_AWAY_STREAK = 2;

function _clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Извлекает углы головы из 4×4 матрицы Face Landmarker (column-major).
 */
export function headPoseFromFacialMatrix(matrixData: Float32Array | number[]): HeadPoseDegrees {
  const m = matrixData;
  const r00 = m[0];
  const r10 = m[1];
  const r20 = m[2];
  const r21 = m[6];
  const r22 = m[10];

  const pitch = Math.asin(_clamp(-r20, -1, 1)) * (180 / Math.PI);
  const yaw = Math.atan2(r10, r00) * (180 / Math.PI);
  const roll = Math.atan2(r21, r22) * (180 / Math.PI);

  return { yaw, pitch, roll };
}

/**
 * Запасная оценка позы головы по ключевым точкам лица (если матрицы нет).
 */
export function headPoseFromLandmarks(landmarks: ReadonlyArray<NormalizedLandmark>): HeadPoseDegrees {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const nose = landmarks[1];

  if (!leftEye || !rightEye || !nose) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const faceWidth = Math.max(Math.abs(rightEye.x - leftEye.x), 0.05);

  const yawRatio = (nose.x - eyeMidX) / faceWidth;
  const pitchRatio = (nose.y - eyeMidY) / faceWidth;

  return {
    yaw: yawRatio * 85,
    pitch: (pitchRatio - 0.58) * 110,
    roll: 0,
  };
}

/** Человек отвернул голову или смотрит не на экран. */
export function isGazeAwayFromScreen(pose: HeadPoseDegrees): boolean {
  return (
    Math.abs(pose.yaw) >= GAZE_YAW_THRESHOLD_DEG ||
    Math.abs(pose.pitch) >= GAZE_PITCH_THRESHOLD_DEG
  );
}
