import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AdminCommandCenter } from "@/components/admin/admin-command-center";

export default async function AdminPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/access-pending");
  const [companies, projects, cycles, tasks, developers, audit, pendingUsers] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true, capacityLimit: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ select: { id: true, name: true, company: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.deliveryCycle.findMany({ include: { project: { include: { company: { select: { name: true, capacityLimit: true } } } }, _count: { select: { tasks: true } } }, orderBy: { date: "desc" }, take: 12 }),
    prisma.task.findMany({ where: { status: { in: ["dusk_intake", "in_progress", "pending_senior_review"] } }, include: { project: { select: { name: true, companyId: true } }, assignee: { select: { id: true, name: true, email: true } } }, orderBy: { updatedAt: "desc" }, take: 40 }),
    prisma.user.findMany({ where: { role: "developer" }, select: { id: true, name: true, email: true, companyMemberships: { select: { companyId: true } } }, orderBy: { name: "asc" } }),
    prisma.auditEvent.findMany({ include: { actor: { select: { name: true, email: true } }, task: { select: { key: true, title: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.user.findMany({ where: { role: "pending" }, select: { id: true, name: true, email: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return <AdminCommandCenter userName={user.name ?? user.email ?? "Lumetha admin"} companies={companies} projects={projects} cycles={cycles.map((cycle) => ({ ...cycle, date: cycle.date.toISOString(), scopeLockedAt: cycle.scopeLockedAt?.toISOString() ?? null }))} tasks={tasks.map((task) => ({ ...task, updatedAt: task.updatedAt.toISOString() }))} developers={developers} audit={audit.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() }))} pendingUsers={pendingUsers.map((pending) => ({ ...pending, createdAt: pending.createdAt.toISOString() }))} />;
}
