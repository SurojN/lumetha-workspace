import { z } from "zod";

export const taskStatuses = [
  "dusk_intake",
  "in_progress",
  "pending_senior_review",
  "dawn_shipped",
] as const;

export type DaybreakStatus = (typeof taskStatuses)[number];

export const allowedTransitions: Record<DaybreakStatus, DaybreakStatus[]> = {
  dusk_intake: ["in_progress"],
  in_progress: ["dusk_intake", "pending_senior_review"],
  pending_senior_review: ["in_progress", "dawn_shipped"],
  dawn_shipped: [],
};

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(20_000).nullable().optional(),
  rawBrief: z.string().max(50_000).optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeId: z.string().nullable().optional(),
  reviewerId: z.string().nullable().optional(),
  technicalSummary: z.string().max(20_000).nullable().optional(),
  repositoryUrl: z.url().nullable().optional(),
  deploymentUrl: z.url().nullable().optional(),
  reviewChecklist: z.object({
    acceptanceCriteria: z.boolean(),
    testsPassing: z.boolean(),
    securityReviewed: z.boolean(),
  }).optional(),
});

export function canTransition(from: DaybreakStatus, to: DaybreakStatus) {
  return from === to || allowedTransitions[from].includes(to);
}
