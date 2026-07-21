import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, requireCompanyMembership } from "@/lib/auth";

const startSchema = z.object({ taskId: z.string().min(1), note: z.string().trim().max(500).optional() });
const stopSchema = z.object({ entryId: z.string().min(1) });

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const taskId = new URL(request.url).searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { project: { select: { companyId: true } } } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  await requireCompanyMembership(task.project.companyId);
  const entries = await prisma.timeEntry.findMany({
    where: { taskId, userId: user.id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const parsed = startSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "A valid task is required" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const task = await prisma.task.findUnique({ where: { id: parsed.data.taskId }, select: { project: { select: { companyId: true } } } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  await requireCompanyMembership(task.project.companyId);
  const active = await prisma.timeEntry.findFirst({ where: { userId: user.id, endedAt: null } });
  if (active) return NextResponse.json({ error: "Stop your active timer before starting another one", active }, { status: 409 });
  const entry = await prisma.timeEntry.create({
    data: { taskId: parsed.data.taskId, userId: user.id, startedAt: new Date(), note: parsed.data.note },
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function PATCH(request: Request) {
  const parsed = stopSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "A valid time entry is required" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.timeEntry.findFirst({ where: { id: parsed.data.entryId, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
  if (existing.endedAt) return NextResponse.json(existing);
  const endedAt = new Date();
  const entry = await prisma.timeEntry.update({
    where: { id: existing.id },
    data: { endedAt, durationSeconds: Math.max(0, Math.floor((endedAt.getTime() - existing.startedAt.getTime()) / 1000)) },
  });
  return NextResponse.json(entry);
}
