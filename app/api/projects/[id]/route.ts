import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isCompanyAdmin, requireCompanyMembership } from "@/lib/auth";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    await requireCompanyMembership(project.companyId);

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to fetch project", error);

    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.project.findUnique({ where: { id }, select: { companyId: true } });
    if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const { membership } = await requireCompanyMembership(existing.companyId);
    if (!isCompanyAdmin(membership.role)) return NextResponse.json({ error: "Only company admins can update projects" }, { status: 403 });

    const project = await prisma.project.update({
      where: { id },
      data: { name: body.name, description: body.description, icon: body.icon, category: body.category, isPublic: body.isPublic },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to update project", error);

    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const existing = await prisma.project.findUnique({ where: { id }, select: { companyId: true } });
    if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const { membership } = await requireCompanyMembership(existing.companyId);
    if (!isCompanyAdmin(membership.role)) return NextResponse.json({ error: "Only company admins can delete projects" }, { status: 403 });

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project", error);

    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}
