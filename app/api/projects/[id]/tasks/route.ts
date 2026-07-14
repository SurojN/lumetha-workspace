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
    const { title, key, description, creatorId, ...rest } = body;

    const task = await prisma.task.create({
      data: {
        title,
        key,
        description,
        projectId: id,
        creatorId,
        ...rest,
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
