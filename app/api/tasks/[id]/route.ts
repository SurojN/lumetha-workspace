import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, requireCompanyMembership } from "@/lib/auth";
import { canTransition, taskUpdateSchema, type DaybreakStatus } from "@/lib/daybreak";
import { Prisma } from "@prisma/client";
import { rolesForUser } from "@/lib/roles";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: true,
        assignee: true,
        comments: {
          include: {
            user: true,
          },
        },
        subtasks: true,
        attachments: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { companyId: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    await requireCompanyMembership(project.companyId);

    return NextResponse.json(task);
  } catch (error) {
    console.error("Failed to fetch task", error);

    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const parsed = taskUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid task update", details: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data;
    const existing = await prisma.task.findUnique({ where: { id }, include: { project: { select: { companyId: true } } } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const { user, membership } = await requireCompanyMembership(existing.project.companyId);
    const roles = await rolesForUser(user.id, user.role);
    if (roles.includes("client") && roles.length === 1) return NextResponse.json({ error: "Clients cannot update delivery tasks" }, { status: 403 });
    if (roles.includes("developer") && !roles.includes("senior_engineer") && existing.assigneeId !== user.id) return NextResponse.json({ error: "Developers can only update assigned tasks" }, { status: 403 });

    if (body.status && !canTransition(existing.status as DaybreakStatus, body.status)) {
      return NextResponse.json({ error: `Invalid lifecycle transition: ${existing.status} → ${body.status}` }, { status: 409 });
    }

    if (body.status === "dawn_shipped") {
      const isSenior = roles.includes("senior_engineer") || roles.includes("admin") || membership.role === "company_admin";
      if (!isSenior) return NextResponse.json({ error: "Only a senior reviewer can ship work" }, { status: 403 });
      const checklist = body.reviewChecklist;
      const summary = body.technicalSummary ?? existing.technicalSummary;
      const repositoryUrl = body.repositoryUrl ?? existing.repositoryUrl;
      const deploymentUrl = body.deploymentUrl ?? existing.deploymentUrl;
      if (!checklist || !Object.values(checklist).every(Boolean) || !summary || (!repositoryUrl && !deploymentUrl)) {
        return NextResponse.json({ error: "Shipping requires a completed review checklist, technical summary, and delivery link" }, { status: 422 });
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...body,
        reviewChecklist: body.reviewChecklist as Prisma.InputJsonValue | undefined,
        reviewerId: body.status === "dawn_shipped" ? user.id : body.reviewerId,
        reviewedAt: body.status === "dawn_shipped" ? new Date() : undefined,
      },
      include: {
        creator: true,
        assignee: true,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Failed to update task", error);

    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const existing = await prisma.task.findUnique({ where: { id }, include: { project: { select: { companyId: true } } } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    await requireCompanyMembership(existing.project.companyId);

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task", error);

    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
