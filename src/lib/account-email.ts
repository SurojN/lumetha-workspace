import "server-only";

import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

function applicationUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export async function sendAccountSetupEmail(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  const token = randomBytes(32).toString("base64url");
  const setup = await prisma.$transaction(async (tx) => {
    await tx.accountSetupToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    return tx.accountSetupToken.create({
      data: {
        userId: user.id,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "EMAIL_NOT_CONFIGURED" as const };

  const url = `${applicationUrl().replace(/\/$/, "")}/set-password/${token}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Lumetha <onboarding@resend.dev>",
      to: [user.email],
      subject: "Set up your Lumetha Workspace account",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#173d30"><h1>Welcome to Lumetha</h1><p>Hello ${escapeHtml(user.name ?? "there")},</p><p>Your workspace access is ready. Set your private password using the secure link below. The link expires in 24 hours and can only be used once.</p><p><a href="${url}" style="display:inline-block;background:#1D4B3B;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Set my password</a></p><p style="color:#64748b;font-size:13px">Lumetha administrators cannot see your password.</p></div>`,
    }),
  });
  if (!response.ok) return { sent: false, reason: "EMAIL_SEND_FAILED" as const };
  await prisma.accountSetupToken.update({
    where: { id: setup.id },
    data: { sentAt: new Date() },
  });
  return { sent: true };
}

export const hashAccountSetupToken = hash;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!,
  );
}
