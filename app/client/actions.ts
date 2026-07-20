"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { userHasRole } from "@/lib/roles";

async function requireClient() {
  const user = await requireUser();
  if (!(await userHasRole(user.id, ["client"], user.role))) throw new Error("CLIENT_REQUIRED");
  return user;
}

const planItem = z.object({ title: z.string().min(1), description: z.string(), discipline: z.enum(["frontend", "backend", "qa", "delivery"]), technical_requirements: z.string(), testing_criteria: z.string(), priority: z.enum(["normal", "high", "urgent"]) });

export async function lockClientBrief(formData: FormData) {
  const user = await requireClient();
  const parsed = z.object({ companyId: z.string(), projectId: z.string(), title: z.string().trim().min(1).max(160), brief: z.string().trim().min(20).max(50_000), figmaUrl: z.union([z.literal(""), z.url()]), taskPlan: z.string() }).parse(Object.fromEntries(formData));
  const membership = await prisma.companyMember.findUnique({ where: { companyId_userId: { companyId: parsed.companyId, userId: user.id } }, include: { company: true } });
  const project = await prisma.project.findFirst({ where: { id: parsed.projectId, companyId: parsed.companyId } });
  if (!membership || !project) throw new Error("FORBIDDEN");
  const tasks = z.array(planItem).min(1).max(12).parse(JSON.parse(parsed.taskPlan));
  const cycle = await prisma.deliveryCycle.findFirst({ where: { projectId: project.id, status: "intake_open", isActive: true }, include: { _count: { select: { tasks: true } } }, orderBy: { date: "desc" } });
  if (!cycle) throw new Error("INTAKE_CLOSED");
  if (cycle._count.tasks + tasks.length > membership.company.capacityLimit) throw new Error("CAPACITY_EXCEEDED");
  const batch = Date.now().toString(36).toUpperCase();
  await prisma.$transaction(async (tx) => {
    await tx.requirementDocument.create({ data: { companyId: parsed.companyId, authorId: user.id, title: parsed.title, content: `${parsed.brief}${parsed.figmaUrl ? `\n\nFigma: ${parsed.figmaUrl}` : ""}`, status: "locked" } });
    for (const [index, task] of tasks.entries()) {
      const created = await tx.task.create({ data: { projectId: project.id, cycleId: cycle.id, creatorId: user.id, key: `BR-${batch}-${index + 1}`, title: task.title, description: task.description, rawBrief: parsed.brief, type: task.discipline === "qa" ? "bug" : "task", priority: task.priority === "normal" ? "medium" : task.priority, aiParsedChecklist: [{ title: task.title, description: task.description, technical_requirements: task.technical_requirements, testing_criteria: task.testing_criteria }] as Prisma.InputJsonValue } });
      await tx.auditEvent.create({ data: { taskId: created.id, cycleId: cycle.id, actorId: user.id, action: "client_brief_locked", details: { figmaUrl: parsed.figmaUrl || null, discipline: task.discipline } } });
    }
  });
  revalidatePath("/client"); revalidatePath("/admin");
}

export async function submitDawnDecision(formData: FormData) {
  const user = await requireClient();
  const parsed = z.object({ taskId: z.string(), decision: z.enum(["approved", "rejected"]), acceptance: z.string().optional(), visual: z.string().optional(), notes: z.string().trim().max(3000), reversionReason: z.string().trim().max(3000).optional() }).parse(Object.fromEntries(formData));
  const task = await prisma.task.findFirst({ where: { id: parsed.taskId, project: { company: { members: { some: { userId: user.id } } } }, status: "dawn_shipped" } });
  if (!task) throw new Error("TASK_NOT_DELIVERED");
  if (parsed.decision === "approved" && (!parsed.acceptance || !parsed.visual)) throw new Error("APPROVAL_CRITERIA_REQUIRED");
  if (parsed.decision === "rejected" && (!parsed.reversionReason || parsed.reversionReason.length < 10)) throw new Error("REVERSION_REASON_REQUIRED");
  const feedback = { acceptance: parsed.acceptance === "on", visual: parsed.visual === "on", notes: parsed.notes, reversionReason: parsed.reversionReason ?? null };
  await prisma.$transaction([
    prisma.task.update({ where: { id: task.id }, data: { clientDecision: parsed.decision, clientFeedback: feedback, approvedAt: parsed.decision === "approved" ? new Date() : null, status: parsed.decision === "rejected" ? "in_progress" : undefined } }),
    prisma.auditEvent.create({ data: { taskId: task.id, cycleId: task.cycleId, actorId: user.id, action: parsed.decision === "approved" ? "client_approved_merge" : "client_requested_reversion", details: feedback } }),
  ]);
  revalidatePath("/client"); revalidatePath("/admin");
}
