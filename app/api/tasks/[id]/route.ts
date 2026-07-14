import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

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

    const task = await prisma.task.update({
      where: { id },
      data: body,
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
