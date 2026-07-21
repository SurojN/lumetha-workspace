import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyMembership } from "@/lib/auth";
import { z } from "zod";
import { rolesForUser } from "@/lib/roles";
import { notifyTaskParticipants } from "@/lib/notifications";

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  key: z.string().trim().min(1).max(32),
  rawBrief: z.string().trim().min(1).max(50_000),
  description: z.string().max(20_000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assigneeId: z.string().optional(),
  type: z.enum(["task", "bug", "feature", "improvement"]).default("task"),
  cycleId: z.string().optional(),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id }, select: { companyId: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const { user } = await requireCompanyMembership(project.companyId);
    const roles = await rolesForUser(user.id, user.role);
    const visibility = roles.includes("developer") && roles.includes("senior_engineer")
      ? { OR: [{ assigneeId: user.id }, { status: "pending_senior_review" as const }] }
      : roles.includes("developer") ? { assigneeId: user.id }
      : roles.includes("senior_engineer") ? { status: "pending_senior_review" as const }
      : {};

    const tasks = await prisma.task.findMany({
      where: { projectId: id, ...visibility },
      include: {
        creator: true,
        assignee: true,
        attachments: true,
        pullRequests: { orderBy: { updatedAt: "desc" }, take: 5 },
        comments: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to fetch tasks", error);

    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const parsed = createTaskSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "A title and raw brief are required", details: parsed.error.flatten() }, { status: 400 });
    const { title, key, rawBrief, description, assigneeId, type, priority, cycleId } = parsed.data;
    const project = await prisma.project.findUnique({ where: { id }, select: { companyId: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const { user } = await requireCompanyMembership(project.companyId);
    const roles = await rolesForUser(user.id, user.role);
    if (!roles.some((role) => ["qa", "project_manager", "admin"].includes(role))) return NextResponse.json({ error: "Only PM, QA, or Lumetha admins can create tasks" }, { status: 403 });
    if (cycleId) {
      const cycle = await prisma.deliveryCycle.findFirst({ where: { id: cycleId, isActive: true } });
      if (!cycle) return NextResponse.json({ error: "Delivery cycle is not active" }, { status: 409 });
    }

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title,
          key,
          description,
          rawBrief,
          projectId: id,
          creatorId: user.id,
          assigneeId,
          type,
          priority,
          cycleId,
          status: "dusk_intake",
        },
        include: {
          creator: true,
          assignee: true,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          taskId: created.id,
          cycleId,
          action: "task.created",
          details: { key: created.key, source: "workspace" },
        },
      });
      await notifyTaskParticipants(tx, created.id, user.id, {
        type: "task.created",
        title: `${created.key} was added to Dusk Intake`,
        message: `“${created.title}” is ready for the delivery pod.`,
      });
      return created;
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Failed to create task", error);

    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
