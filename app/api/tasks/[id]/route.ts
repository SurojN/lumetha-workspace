import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, requireCompanyMembership } from "@/lib/auth";

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
    const body = await req.json();
    const existing = await prisma.task.findUnique({ where: { id }, include: { project: { select: { companyId: true } } } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    await requireCompanyMembership(existing.project.companyId);

    const task = await prisma.task.update({
      where: { id },
      data: { title: body.title, description: body.description, status: body.status, priority: body.priority, assigneeId: body.assigneeId, boardColumnId: body.boardColumnId, sprintId: body.sprintId, storyPoints: body.storyPoints, dueDate: body.dueDate ? new Date(body.dueDate) : undefined, order: body.order },
      include: {
        creator: true,
        assignee: true,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
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
