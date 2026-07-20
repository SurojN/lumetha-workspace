import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, requireCompanyMembership } from "@/lib/auth";

const documentSchema = z.object({ companyId: z.string(), title: z.string().trim().min(1).max(160), content: z.string().trim().min(20).max(50_000), status: z.enum(["draft", "submitted"]).default("draft") });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const documents = await prisma.requirementDocument.findMany({ where: { company: { members: { some: { userId: user.id } } } }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const parsed = documentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "A title and detailed requirement are required" }, { status: 400 });
  const { user } = await requireCompanyMembership(parsed.data.companyId);
  if (!["client", "admin", "project_manager", "qa"].includes(user.role)) return NextResponse.json({ error: "Your role cannot create requirements" }, { status: 403 });
  const document = await prisma.requirementDocument.create({ data: { ...parsed.data, authorId: user.id } });
  return NextResponse.json(document, { status: 201 });
}
