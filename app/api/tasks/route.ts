import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rolesForUser } from "@/lib/roles";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const roles = await rolesForUser(user.id, user.role);
    const visibility = roles.includes("developer") && roles.includes("senior_engineer")
      ? { OR: [{ assigneeId: user.id }, { status: "pending_senior_review" as const }] }
      : roles.includes("developer") ? { assigneeId: user.id }
      : roles.includes("senior_engineer") ? { status: "pending_senior_review" as const }
      : {};
    const tasks = await prisma.task.findMany({
      where: { project: { company: { members: { some: { userId: user.id } } } }, ...visibility },
      include: {
        creator: true,
        assignee: true,
        attachments: true,
        pullRequests: { orderBy: { updatedAt: "desc" }, take: 5 },
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
