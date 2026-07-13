import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET({ params }: Params) {
  try {
    const { id: projectId } = await params;
    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      include: {
        tasks: true,
      },
    });

    return NextResponse.json(sprints);
  } catch (error) {
    console.error("Failed to fetch sprints", error);

    return NextResponse.json(
      { error: "Failed to fetch sprints" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const { name, goal } = body;

    const sprint = await prisma.sprint.create({
      data: {
        projectId,
        name,
        goal,
        status: "backlog",
      },
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (error) {
    console.error("Failed to create sprint", error);

    return NextResponse.json(
      { error: "Failed to create sprint" },
      { status: 500 },
    );
  }
}
