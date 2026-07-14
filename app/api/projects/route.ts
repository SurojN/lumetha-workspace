import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, requireCompanyMembership, isCompanyAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const projects = await prisma.project.findMany({
      where: { company: { members: { some: { userId: user.id } } } },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, key, description, companyId } = body;
    if (!companyId || !name || !key) return NextResponse.json({ error: "name, key, and companyId are required" }, { status: 400 });
    const { user, membership } = await requireCompanyMembership(companyId);
    if (!isCompanyAdmin(membership.role)) return NextResponse.json({ error: "Only company admins can create projects" }, { status: 403 });

    const project = await prisma.project.create({
      data: {
        name,
        key,
        description,
        ownerId: user.id,
        companyId,
        members: { create: { userId: user.id, role: "owner" } },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Failed to create project", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
