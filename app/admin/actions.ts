"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sendAccountSetupEmail } from "@/lib/account-email";
import { assignableRoles, primaryRole, userHasRole } from "@/lib/roles";

async function requireAdmin() {
  const user = await requireUser();
  if (!(await userHasRole(user.id, ["admin"], user.role))) throw new Error("ADMIN_REQUIRED");
  return user;
}

const id = z.string().min(1);
const cycleStatuses = ["intake_open", "scope_locked", "in_sprint", "dawn_delivery"] as const;
const accountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  companyId: id,
});

function parseRoles(formData: FormData) {
  return z.array(z.enum(assignableRoles)).min(1).parse(formData.getAll("roles"));
}

async function assertCompany(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("COMPANY_NOT_FOUND");
  return company;
}

export async function createWorkspaceUser(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = accountSchema.parse(Object.fromEntries(formData));
  const roles = parseRoles(formData);
  await assertCompany(parsed.companyId);
  if (await prisma.user.findUnique({ where: { email: parsed.email } })) throw new Error("EMAIL_ALREADY_EXISTS");
  const user = await prisma.user.create({ data: { name: parsed.name, email: parsed.email, role: primaryRole(roles), roleAssignments: { create: roles.map((role) => ({ role })) }, companyMemberships: { create: { companyId: parsed.companyId, role: roles.includes("admin") ? "company_admin" : "member" } } } });
  const delivery = await sendAccountSetupEmail({ id: user.id, email: parsed.email, name: user.name });
  await prisma.auditEvent.create({ data: { actorId: admin.id, action: "workspace_user_created", details: { userId: user.id, email: user.email, roles, companyId: parsed.companyId, setupEmailSent: delivery.sent } } });
  revalidatePath("/admin");
}

export async function approveAccessRequest(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = accountSchema.pick({ companyId: true }).extend({ userId: id }).parse(Object.fromEntries(formData));
  const roles = parseRoles(formData);
  const pending = await prisma.user.findUnique({ where: { id: parsed.userId } });
  if (!pending?.email || pending.role !== "pending") throw new Error("REQUEST_NOT_PENDING");
  await assertCompany(parsed.companyId);
  await prisma.$transaction([
    prisma.user.update({ where: { id: pending.id }, data: { role: primaryRole(roles), roleAssignments: { create: roles.map((role) => ({ role })) }, companyMemberships: { create: { companyId: parsed.companyId, role: roles.includes("admin") ? "company_admin" : "member" } } } }),
    prisma.auditEvent.create({ data: { actorId: admin.id, action: "access_request_approved", details: { userId: pending.id, email: pending.email, roles, companyId: parsed.companyId } } }),
  ]);
  revalidatePath("/admin");
}

export async function updateWorkspaceUser(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = accountSchema.extend({ userId: id }).parse(Object.fromEntries(formData));
  const roles = parseRoles(formData);
  if (parsed.userId === admin.id && !roles.includes("admin")) throw new Error("CANNOT_REMOVE_OWN_ADMIN_ROLE");
  await assertCompany(parsed.companyId);
  await prisma.$transaction(async (tx) => {
    await tx.userRoleAssignment.deleteMany({ where: { userId: parsed.userId } });
    await tx.companyMember.deleteMany({ where: { userId: parsed.userId } });
    await tx.user.update({ where: { id: parsed.userId }, data: { name: parsed.name, email: parsed.email, role: primaryRole(roles), disabledAt: null, roleAssignments: { create: roles.map((role) => ({ role })) }, companyMemberships: { create: { companyId: parsed.companyId, role: roles.includes("admin") ? "company_admin" : "member" } } } });
    await tx.auditEvent.create({ data: { actorId: admin.id, action: "workspace_user_updated", details: { userId: parsed.userId, roles, companyId: parsed.companyId } } });
  });
  revalidatePath("/admin");
}

export async function removeWorkspaceUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = id.parse(formData.get("userId"));
  if (userId === admin.id) throw new Error("CANNOT_REMOVE_SELF");
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!target || target.email === "lumethaadmin@lumetha.lu") throw new Error("PROTECTED_ACCOUNT");
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.companyMember.deleteMany({ where: { userId } }),
    prisma.userRoleAssignment.deleteMany({ where: { userId } }),
    prisma.accountSetupToken.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { disabledAt: new Date(), role: "pending" } }),
    prisma.auditEvent.create({ data: { actorId: admin.id, action: "workspace_user_removed", details: { userId, email: target.email } } }),
  ]);
  revalidatePath("/admin");
}

export async function resendAccountSetup(formData: FormData) {
  const admin = await requireAdmin();
  const userId = id.parse(formData.get("userId"));
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target?.email || target.disabledAt) throw new Error("USER_NOT_AVAILABLE");
  const delivery = await sendAccountSetupEmail({ id: target.id, email: target.email, name: target.name });
  await prisma.auditEvent.create({ data: { actorId: admin.id, action: "account_setup_email_requested", details: { userId, sent: delivery.sent } } });
  revalidatePath("/admin");
}

export async function rejectAccessRequest(formData: FormData) {
  const admin = await requireAdmin();
  const userId = id.parse(formData.get("userId"));
  if (userId === admin.id) throw new Error("CANNOT_REMOVE_SELF");
  const pending = await prisma.user.findUnique({ where: { id: userId } });
  if (!pending || pending.role !== "pending") throw new Error("REQUEST_NOT_PENDING");
  await prisma.$transaction([
    prisma.auditEvent.create({ data: { actorId: admin.id, action: "access_request_rejected", details: { userId: pending.id, email: pending.email } } }),
    prisma.user.delete({ where: { id: pending.id } }),
  ]);
  revalidatePath("/admin");
}

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
