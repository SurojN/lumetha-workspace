import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyMembership } from "@/lib/auth";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id }, select: { companyId: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    await requireCompanyMembership(project.companyId);

    const tasks = await prisma.task.findMany({
      where: { projectId: id },
      include: {
        creator: true,
        assignee: true,
        comments: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to fetch tasks", error);

    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, key, description, assigneeId, type, priority, storyPoints, dueDate, boardColumnId, sprintId } = body;
    const project = await prisma.project.findUnique({ where: { id }, select: { companyId: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const { user } = await requireCompanyMembership(project.companyId);
    if (!title || !key) return NextResponse.json({ error: "title and key are required" }, { status: 400 });

    const task = await prisma.task.create({
      data: {
        title,
        key,
        description,
        projectId: id,
        creatorId: user.id,
        assigneeId,
        type,
        priority,
        storyPoints,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        boardColumnId,
        sprintId,
      },
      include: {
        creator: true,
        assignee: true,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Failed to create task", error);

    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
