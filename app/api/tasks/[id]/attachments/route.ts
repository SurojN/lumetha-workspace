import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import prisma from "@/lib/prisma";
import { requireCompanyMembership } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain", "text/markdown", "application/zip"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
  const { id } = await context.params;
  const task = await prisma.task.findUnique({ where: { id }, select: { key: true, project: { select: { companyId: true } } } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  await requireCompanyMembership(task.project.companyId);
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Files must be between 1 byte and 10 MB" }, { status: 413 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "This file type is not allowed" }, { status: 415 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
  const blob = await put(`tasks/${task.key}/${crypto.randomUUID()}-${safeName}`, file, { access: "private", addRandomSuffix: false });
  const attachment = await prisma.attachment.create({ data: { taskId: id, url: blob.url, name: file.name, size: file.size, type: file.type } });
  return NextResponse.json({ ...attachment, downloadUrl: `/api/attachments/${attachment.id}` }, { status: 201 });
}
