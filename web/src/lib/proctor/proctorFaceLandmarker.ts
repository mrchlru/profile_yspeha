import {
  headPoseFromFacialMatrix,
  headPoseFromLandmarks,
  type HeadPoseDegrees,
  type NormalizedLandmark,
} from "@/lib/proctor/headPoseAnalysis";

export type FaceVideoAnalysis = {
  faceCount: number;
  headPose: HeadPoseDegrees | null;
};

/**
 * Создаёт Face Landmarker для подсчёта лиц и оценки поворота головы.
 */
export async function createProctorFaceLandmarker(): Promise<{
  analyzeVideo: (video: HTMLVideoElement, timestampMs: number) => FaceVideoAnalysis;
}> {
  const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  const baseOptions = {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  };

  const sharedOptions = {
    baseOptions,
    runningMode: "VIDEO" as const,
    numFaces: 2,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true,
  };

  const landmarker = await FaceLandmarker.createFromOptions(vision, {
    ...sharedOptions,
    baseOptions: { ...baseOptions, delegate: "GPU" },
  }).catch(() =>
    FaceLandmarker.createFromOptions(vision, {
      ...sharedOptions,
      baseOptions: { ...baseOptions, delegate: "CPU" },
    })
  );

  return {
    analyzeVideo(video: HTMLVideoElement, timestampMs: number): FaceVideoAnalysis {
      const result = landmarker.detectForVideo(video, timestampMs);
      const faceCount = result.faceLandmarks?.length ?? 0;
      if (faceCount === 0) {
        return { faceCount: 0, headPose: null };
      }

      const matrixData = result.facialTransformationMatrixes?.[0]?.data;
      if (matrixData && matrixData.length >= 16) {
        return { faceCount, headPose: headPoseFromFacialMatrix(matrixData) };
      }

      const landmarks = result.faceLandmarks?.[0] as ReadonlyArray<NormalizedLandmark> | undefined;
      if (landmarks) {
        return { faceCount, headPose: headPoseFromLandmarks(landmarks) };
      }

      return { faceCount, headPose: null };
    },
  };
}
