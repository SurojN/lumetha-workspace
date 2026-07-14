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

    const boards = await prisma.board.findMany({
      where: { projectId },
      include: {
        columns: true,
      },
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Failed to fetch boards", error);

    return NextResponse.json(
      { error: "Failed to fetch boards" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const { name, type } = await req.json();
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { companyId: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const { membership } = await requireCompanyMembership(project.companyId);
    if (!isCompanyAdmin(membership.role)) return NextResponse.json({ error: "Only company admins can create boards" }, { status: 403 });

    const board = await prisma.board.create({
      data: {
        projectId,
        name,
        type,
        columns: {
          create: [
            { name: "To Do", order: 0 },
            { name: "In Progress", order: 1 },
            { name: "PM Review", order: 2 },
            { name: "Testing", order: 3 },
            { name: "Done", order: 4 },
          ],
        },
      },
      include: {
        columns: true,
      },
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error("Failed to create board", error);

    return NextResponse.json(
      { error: "Failed to create board" },
      { status: 500 },
    );
  }
}
