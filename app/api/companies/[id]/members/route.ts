import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { isCompanyAdmin, requireCompanyMembership } from "@/lib/auth";

const memberSchema = z.object({ email: z.email().trim().toLowerCase(), role: z.enum(["company_admin", "member", "viewer"]).default("member") });

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Context) {
  try {
    const { id: companyId } = await ctx.params;
    const { membership } = await requireCompanyMembership(companyId);
    if (!isCompanyAdmin(membership.role)) return NextResponse.json({ error: "Only company admins can manage access" }, { status: 403 });
    const data = memberSchema.safeParse(await request.json());
    if (!data.success) return NextResponse.json({ error: "Provide a valid email and role" }, { status: 400 });
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    if (company.emailDomain && !data.data.email.endsWith(`@${company.emailDomain}`)) {
      return NextResponse.json({ error: `Only @${company.emailDomain} addresses can access this company` }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: data.data.email } });
    if (!user) return NextResponse.json({ error: "This person needs to create an account first" }, { status: 404 });
    const member = await prisma.companyMember.upsert({ where: { companyId_userId: { companyId, userId: user.id } }, update: { role: data.data.role }, create: { companyId, userId: user.id, role: data.data.role } });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unable to update company access" }, { status: 500 });
  }
}
