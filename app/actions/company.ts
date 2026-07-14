"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const companySchema = z.object({
  name: z.string().trim().min(2).max(80),
  emailDomain: z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/).optional().or(z.literal("")),
});

export async function createCompany(formData: FormData) {
  const user = await requireUser();
  const parsed = companySchema.safeParse({ name: formData.get("name"), emailDomain: formData.get("emailDomain") });
  if (!parsed.success) redirect("/onboarding/company?error=invalid");
  const baseSlug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  await prisma.company.create({
    data: {
      name: parsed.data.name,
      slug,
      emailDomain: parsed.data.emailDomain || null,
      ownerId: user.id,
      members: { create: { userId: user.id, role: "company_admin" } },
    },
  });
  redirect("/");
}
