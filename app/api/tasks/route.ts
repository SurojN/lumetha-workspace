import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tasks = await prisma.task.findMany({
      where: { project: { company: { members: { some: { userId: user.id } } } }, ...(user.role === "developer" ? { assigneeId: user.id } : {}), ...(user.role === "senior_engineer" ? { status: "pending_senior_review" as const } : {}) },
      include: {
        creator: true,
        assignee: true,
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
