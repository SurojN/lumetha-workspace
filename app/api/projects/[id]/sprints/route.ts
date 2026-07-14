import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isCompanyAdmin, requireCompanyMembership } from "@/lib/auth";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { companyId: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    await requireCompanyMembership(project.companyId);

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

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const { name, goal } = await req.json();
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { companyId: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const { membership } = await requireCompanyMembership(project.companyId);
    if (!isCompanyAdmin(membership.role)) return NextResponse.json({ error: "Only company admins can create sprints" }, { status: 403 });

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
