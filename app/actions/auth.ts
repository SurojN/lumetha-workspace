"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/auth";

export type AuthState = { error?: string } | undefined;

const credentials = z.object({
  email: z.email("Enter a valid work email.").trim().toLowerCase(),
  password: z.string().min(10, "Use at least 10 characters."),
});

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const name = String(formData.get("name") ?? "").trim();
  if (!parsed.success || name.length < 2) return { error: parsed.error?.issues[0]?.message ?? "Enter your name." };
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: "An account already exists for that email." };
  const user = await prisma.user.create({
    data: { name, email: parsed.data.email, password: await bcrypt.hash(parsed.data.password, 12), role: "pending" },
  });
  await createSession(user.id);
  redirect("/access-pending");
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.password || !(await bcrypt.compare(parsed.data.password, user.password))) {
    return { error: "Email or password is incorrect." };
  }
  await createSession(user.id);
  const membership = await prisma.companyMember.findFirst({ where: { userId: user.id } });
  redirect(user.role === "pending" || !membership ? "/access-pending" : "/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
