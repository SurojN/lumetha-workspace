import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ClientDashboard } from "@/components/client/client-dashboard";

export default async function ClientPage() {
  const user = await requireUser();
  if (user.role !== "client") redirect("/access-pending");
  const membership = await prisma.companyMember.findFirst({ where: { userId: user.id }, include: { company: { include: { projects: { select: { id: true, name: true }, take: 1 } } } } });
  if (!membership || !membership.company.projects[0]) redirect("/access-pending");
  const project = membership.company.projects[0];
  const [tasks, documents, audit, activeCycle] = await Promise.all([
    prisma.task.findMany({ where: { projectId: project.id }, select: { id: true, key: true, title: true, status: true, deploymentUrl: true, repositoryUrl: true, clientDecision: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 40 }),
    prisma.requirementDocument.findMany({ where: { companyId: membership.companyId, authorId: user.id }, select: { id: true, title: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.auditEvent.findMany({ where: { task: { projectId: project.id } }, include: { task: { select: { key: true, title: true, status: true, deploymentUrl: true } }, actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.deliveryCycle.findFirst({ where: { projectId: project.id, isActive: true }, orderBy: { date: "desc" } }),
  ]);
  return <ClientDashboard userName={user.name ?? user.email ?? "Client"} company={{ id: membership.company.id, name: membership.company.name, capacityLimit: membership.company.capacityLimit }} project={project} activeCycle={activeCycle ? { id: activeCycle.id, status: activeCycle.status, date: activeCycle.date.toISOString() } : null} tasks={tasks.map((task) => ({ ...task, updatedAt: task.updatedAt.toISOString() }))} documents={documents.map((doc) => ({ ...doc, updatedAt: doc.updatedAt.toISOString() }))} audit={audit.filter((event): event is typeof event & { task: NonNullable<typeof event.task> } => event.task !== null).map((event) => ({ id: event.id, action: event.action, createdAt: event.createdAt.toISOString(), actorName: event.actor.name, task: event.task }))} />;
}
