"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashAccountSetupToken } from "@/lib/account-email";

export type SetPasswordState = { error?: string } | undefined;

export async function setAccountPassword(
  _: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const parsed = z.object({
    token: z.string().min(20),
    password: z.string().min(10, "Use at least 10 characters.").max(128),
    confirmation: z.string(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.password !== parsed.data.confirmation) return { error: "Passwords do not match." };

  const token = await prisma.accountSetupToken.findUnique({
    where: { tokenHash: hashAccountSetupToken(parsed.data.token) },
    include: { user: true },
  });
  if (!token || token.usedAt || token.expiresAt <= new Date() || token.user.disabledAt)
    return { error: "This setup link is invalid or has expired. Ask a Lumetha admin to send a new one." };

  await prisma.$transaction([
    prisma.user.update({ where: { id: token.userId }, data: { password: await bcrypt.hash(parsed.data.password, 12), emailVerified: new Date() } }),
    prisma.accountSetupToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: token.userId } }),
  ]);
  redirect("/login?setup=complete");
}
