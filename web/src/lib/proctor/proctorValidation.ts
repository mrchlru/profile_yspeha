import { z } from "zod";

import { isProctorEventKind } from "@/lib/proctor/proctorEventKinds";

const proctorEventSchema = z.object({
  clientEventId: z.string().min(1).max(120),
  kind: z.string().refine(isProctorEventKind, { message: "invalid kind" }),
  occurredAt: z.string().datetime(),
  clientFaceCount: z.number().int().min(0).max(20).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const proctorSessionBodySchema = z.object({
  sessionId: z.string().min(1).max(120),
  accessCode: z.string().min(8).max(64),
});

export const proctorEventsBodySchema = proctorSessionBodySchema.extend({
  events: z.array(proctorEventSchema).min(1).max(50),
});

export type ProctorEventsBody = z.infer<typeof proctorEventsBodySchema>;
