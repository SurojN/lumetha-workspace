"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("ADMIN_REQUIRED");
  return user;
}

const id = z.string().min(1);
const cycleStatuses = ["intake_open", "scope_locked", "in_sprint", "dawn_delivery"] as const;

export async function createDeliveryCycle(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({ projectId: id, date: z.coerce.date() }).parse(Object.fromEntries(formData));
  const cycle = await prisma.deliveryCycle.create({ data: { ...parsed, isActive: true } });
  await prisma.auditEvent.create({ data: { cycleId: cycle.id, actorId: admin.id, action: "cycle_created", details: { date: cycle.date.toISOString() } } });
  revalidatePath("/admin");
}

export async function updateCycleStatus(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({ cycleId: id, status: z.enum(cycleStatuses) }).parse(Object.fromEntries(formData));
  const cycle = await prisma.deliveryCycle.update({ where: { id: parsed.cycleId }, data: { status: parsed.status, isActive: parsed.status !== "dawn_delivery" } });
  await prisma.auditEvent.create({ data: { cycleId: cycle.id, actorId: admin.id, action: "cycle_status_changed", details: { status: parsed.status } } });
  revalidatePath("/admin"); revalidatePath("/client");
}

export async function lockCycleScope(formData: FormData) {
  const admin = await requireAdmin();
  const cycleId = id.parse(formData.get("cycleId"));
  const cycle = await prisma.deliveryCycle.findUnique({ where: { id: cycleId }, include: { tasks: true, project: { include: { company: true } } } });
  if (!cycle?.project) throw new Error("CYCLE_NOT_FOUND");
  if (cycle.tasks.length > cycle.project.company.capacityLimit) throw new Error("CAPACITY_EXCEEDED");
  await prisma.$transaction([
    prisma.deliveryCycle.update({ where: { id: cycleId }, data: { status: "scope_locked", scopeLockedAt: new Date() } }),
    prisma.auditEvent.create({ data: { cycleId, actorId: admin.id, action: "scope_locked", details: { taskCount: cycle.tasks.length, capacity: cycle.project.company.capacityLimit } } }),
  ]);
  revalidatePath("/admin"); revalidatePath("/client");
}

export async function reassignTask(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({ taskId: id, developerId: id }).parse(Object.fromEntries(formData));
  const task = await prisma.task.findUnique({ where: { id: parsed.taskId }, include: { project: true } });
  const developer = task && await prisma.companyMember.findFirst({ where: { companyId: task.project.companyId, userId: parsed.developerId, user: { role: "developer" } } });
  if (!task || !developer) throw new Error("INVALID_DISPATCH");
  await prisma.$transaction([
    prisma.task.update({ where: { id: task.id }, data: { assigneeId: parsed.developerId } }),
    prisma.auditEvent.create({ data: { taskId: task.id, actorId: admin.id, action: "task_reassigned", details: { developerId: parsed.developerId } } }),
  ]);
  revalidatePath("/admin");
}

export async function overrideAiTaskPlan(formData: FormData) {
  const admin = await requireAdmin();
  const taskId = id.parse(formData.get("taskId"));
  const raw = z.string().min(2).parse(formData.get("taskJson"));
  const checklist = z.array(z.object({ title: z.string().min(1), description: z.string(), technical_requirements: z.string(), testing_criteria: z.string() })).min(1).parse(JSON.parse(raw));
  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { aiParsedChecklist: checklist as Prisma.InputJsonValue } }),
    prisma.auditEvent.create({ data: { taskId, actorId: admin.id, action: "ai_plan_overridden", details: { itemCount: checklist.length } } }),
  ]);
  revalidatePath("/admin");
}

export async function updateClientCapacity(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({ companyId: id, capacityLimit: z.coerce.number().int().min(1).max(100) }).parse(Object.fromEntries(formData));
  await prisma.company.update({ where: { id: parsed.companyId }, data: { capacityLimit: parsed.capacityLimit } });
  await prisma.auditEvent.create({ data: { actorId: admin.id, action: "capacity_updated", details: parsed } });
  revalidatePath("/admin");
}

export async function bypassReviewGate(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({ taskId: id, reason: z.string().trim().min(15).max(1000), deploymentUrl: z.url() }).parse(Object.fromEntries(formData));
  const task = await prisma.task.findUnique({ where: { id: parsed.taskId } });
  if (!task || task.status !== "pending_senior_review") throw new Error("TASK_NOT_IN_REVIEW");
  await prisma.$transaction([
    prisma.task.update({ where: { id: task.id }, data: { status: "dawn_shipped", deploymentUrl: parsed.deploymentUrl, reviewerId: admin.id, reviewedAt: new Date(), reviewChecklist: { adminBypass: true, reason: parsed.reason } } }),
    prisma.auditEvent.create({ data: { taskId: task.id, actorId: admin.id, action: "review_gate_bypassed", details: { reason: parsed.reason, deploymentUrl: parsed.deploymentUrl } } }),
  ]);
  revalidatePath("/admin"); revalidatePath("/client");
}
