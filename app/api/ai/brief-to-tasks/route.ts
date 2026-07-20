import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const requestSchema = z.object({
  title: z.string().trim().min(1).max(160),
  brief: z.string().trim().min(20).max(50_000),
  projectId: z.string().optional(),
});

const taskSchema = z.object({
  title: z.string(),
  description: z.string(),
  discipline: z.enum(["frontend", "backend", "qa", "delivery"]),
  technical_requirements: z.string(),
  testing_criteria: z.string(),
  priority: z.enum(["normal", "high", "urgent"]),
});

const resultSchema = z.object({ tasks: z.array(taskSchema).min(2).max(12) });

function fallbackTasks(title: string, brief: string) {
  const context = brief.slice(0, 800);
  return [
    { title: `Build ${title} frontend`, description: context, discipline: "frontend" as const, technical_requirements: "Implement responsive UI, loading, empty, error, and accessible interaction states.", testing_criteria: "Verify keyboard access, responsive layouts, and all user-visible states.", priority: "normal" as const },
    { title: `Implement ${title} backend`, description: context, discipline: "backend" as const, technical_requirements: "Add validated server endpoints, authorization checks, and durable schema mappings.", testing_criteria: "Verify valid, invalid, unauthenticated, and unauthorized requests.", priority: "high" as const },
    { title: `QA ${title} end to end`, description: context, discipline: "qa" as const, technical_requirements: "Create an acceptance matrix covering the brief and cross-role permissions.", testing_criteria: "Confirm every acceptance criterion and regression path before senior review.", priority: "normal" as const },
  ];
}

async function persistTasks(userId: string, projectId: string | undefined, brief: string, tasks: z.infer<typeof taskSchema>[]) {
  if (!projectId) return 0;
  const project = await prisma.project.findFirst({ where: { id: projectId, company: { members: { some: { userId } } } }, select: { id: true } });
  if (!project) throw new Error("PROJECT_FORBIDDEN");
  const batch = Date.now().toString(36).toUpperCase();
  await prisma.$transaction(tasks.map((task, index) => prisma.task.create({ data: {
    projectId, creatorId: userId, key: `AI-${batch}-${index + 1}`, title: task.title,
    description: task.description, rawBrief: brief, status: "dusk_intake",
    type: task.discipline === "qa" ? "bug" : "task", priority: task.priority === "normal" ? "medium" : task.priority,
    aiParsedChecklist: [{ title: task.title, description: task.description, technical_requirements: task.technical_requirements, testing_criteria: task.testing_criteria }] as Prisma.InputJsonValue,
  } })));
  return tasks.length;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["client", "admin", "project_manager", "qa"].includes(user.role)) return NextResponse.json({ error: "Your role cannot generate tasks" }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Provide a title and detailed brief" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const tasks = fallbackTasks(parsed.data.title, parsed.data.brief);
    const created = await persistTasks(user.id, parsed.data.projectId, parsed.data.brief, tasks);
    return NextResponse.json({ tasks, created, source: "fallback" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_TASK_MODEL ?? "gpt-5.6-sol",
      reasoning: { effort: "medium" },
      input: [
        { role: "system", content: "Role: Lumetha technical product manager. Goal: convert one client requirement into independently deliverable frontend, backend, QA, and delivery tasks when those disciplines are relevant. Preserve the client's facts. Success means every task has implementation detail and exact senior-review criteria. Never invent integrations, deadlines, or business rules." },
        { role: "user", content: `Requirement: ${parsed.data.title}\n\n${parsed.data.brief}` },
      ],
      text: {
        verbosity: "medium",
        format: {
          type: "json_schema",
          name: "lumetha_task_plan",
          strict: true,
          schema: {
            type: "object", additionalProperties: false, required: ["tasks"],
            properties: { tasks: { type: "array", minItems: 2, maxItems: 12, items: { type: "object", additionalProperties: false, required: ["title", "description", "discipline", "technical_requirements", "testing_criteria", "priority"], properties: { title: { type: "string" }, description: { type: "string" }, discipline: { type: "string", enum: ["frontend", "backend", "qa", "delivery"] }, technical_requirements: { type: "string" }, testing_criteria: { type: "string" }, priority: { type: "string", enum: ["normal", "high", "urgent"] } } } } },
          },
        },
      },
    }),
  });
  if (!response.ok) {
    const tasks = fallbackTasks(parsed.data.title, parsed.data.brief); const created = await persistTasks(user.id, parsed.data.projectId, parsed.data.brief, tasks);
    return NextResponse.json({ tasks, created, source: "fallback", warning: "AI service was unavailable" });
  }
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const outputText = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  let structured: unknown = {};
  try { structured = JSON.parse(outputText ?? "{}"); } catch { /* validated below */ }
  const validated = resultSchema.safeParse(structured);
  if (!validated.success) { const tasks = fallbackTasks(parsed.data.title, parsed.data.brief); const created = await persistTasks(user.id, parsed.data.projectId, parsed.data.brief, tasks); return NextResponse.json({ tasks, created, source: "fallback", warning: "AI returned an invalid plan" }); }
  const created = await persistTasks(user.id, parsed.data.projectId, parsed.data.brief, validated.data.tasks);
  return NextResponse.json({ ...validated.data, created, source: "openai" });
}
