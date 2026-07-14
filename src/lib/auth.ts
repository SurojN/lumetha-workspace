import "server-only";

import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

const SESSION_COOKIE = "lumetha_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await prisma.session.create({
    data: { userId, sessionToken: hashToken(token), expires },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expires < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCompanyMembership(companyId: string) {
  const user = await requireUser();
  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId: user.id } },
  });
  if (!membership) throw new Error("FORBIDDEN");
  return { user, membership };
}

export const isCompanyAdmin = (role: string) => role === "company_admin";
