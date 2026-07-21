import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyMembership } from "@/lib/auth";
import { notifyTaskParticipants } from "@/lib/notifications";

const pullUrl = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)(?:\/.*)?$/i;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return NextResponse.json({ error: "GitHub synchronization is not configured" }, { status: 503 });
  const { id } = await context.params;
  const task = await prisma.task.findUnique({ where: { id }, include: { project: { select: { companyId: true } } } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const { user } = await requireCompanyMembership(task.project.companyId);
  const body = (await request.json().catch(() => ({}))) as { repositoryUrl?: string };
  const repositoryUrl = body.repositoryUrl ?? task.repositoryUrl;
  const match = repositoryUrl?.match(pullUrl);
  if (!match) return NextResponse.json({ error: "Add a GitHub pull-request URL to the task first" }, { status: 422 });
  const repository = match[1];
  const pullNumber = Number(match[2]);
  const response = await fetch(`https://api.github.com/repos/${repository}/pulls/${pullNumber}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  const pull = (await response.json()) as {
    html_url?: string;
    title?: string;
    state?: string;
    draft?: boolean;
    merged?: boolean;
    merged_at?: string | null;
    head?: { sha?: string };
    message?: string;
  };
  if (!response.ok || !pull.html_url || !pull.title || !pull.state) {
    return NextResponse.json({ error: pull.message ?? "GitHub could not return this pull request" }, { status: response.status });
  }
  const record = await prisma.$transaction(async (tx) => {
    if (repositoryUrl !== task.repositoryUrl) await tx.task.update({ where: { id }, data: { repositoryUrl } });
    const synced = await tx.gitHubPullRequest.upsert({
      where: { repository_pullNumber: { repository, pullNumber } },
      create: {
        taskId: id,
        repository,
        pullNumber,
        url: pull.html_url!,
        title: pull.title!,
        state: pull.merged ? "merged" : pull.state!,
        isDraft: Boolean(pull.draft),
        headSha: pull.head?.sha,
        mergedAt: pull.merged_at ? new Date(pull.merged_at) : null,
      },
      update: {
        taskId: id,
        url: pull.html_url!,
        title: pull.title!,
        state: pull.merged ? "merged" : pull.state!,
        isDraft: Boolean(pull.draft),
        headSha: pull.head?.sha,
        mergedAt: pull.merged_at ? new Date(pull.merged_at) : null,
        lastSyncedAt: new Date(),
      },
    });
    await tx.auditEvent.create({
      data: { actorId: user.id, taskId: id, action: "github.pull_request.synced", details: { repository, pullNumber, state: synced.state } },
    });
    await notifyTaskParticipants(tx, id, user.id, {
      type: "github.pull_request",
      title: `${task.key}: GitHub PR synchronized`,
      message: `${repository}#${pullNumber} is ${synced.state}.`,
    });
    return synced;
  });
  return NextResponse.json(record);
}
