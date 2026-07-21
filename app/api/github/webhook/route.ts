import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyTaskParticipants } from "@/lib/notifications";

type PullRequestPayload = {
  action: string;
  repository: { full_name: string };
  pull_request: {
    number: number;
    html_url: string;
    title: string;
    body: string | null;
    state: string;
    draft: boolean;
    merged: boolean;
    merged_at: string | null;
    head: { sha: string; ref: string };
  };
};

function validSignature(raw: string, signature: string | null, secret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "GitHub webhook is not configured" }, { status: 503 });
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (request.headers.get("x-github-event") !== "pull_request") {
    return NextResponse.json({ ignored: true });
  }
  const payload = JSON.parse(raw) as PullRequestPayload;
  const pr = payload.pull_request;
  const searchable = `${pr.title} ${pr.body ?? ""} ${pr.head.ref}`;
  const candidates = await prisma.task.findMany({
    where: {
      OR: [
        { repositoryUrl: pr.html_url },
        { repositoryUrl: { contains: `${payload.repository.full_name}/pull/${pr.number}` } },
      ],
    },
    select: { id: true, key: true },
    take: 2,
  });
  let task: { id: string; key: string } | undefined = candidates[0];
  if (!task) {
    const keys = [...searchable.matchAll(/\b[A-Z][A-Z0-9]+-\d+\b/g)].map((match) => match[0]);
    if (keys.length) task = await prisma.task.findFirst({ where: { key: { in: keys } }, select: { id: true, key: true } }) ?? undefined;
  }
  if (!task) return NextResponse.json({ ignored: true, reason: "No Lumetha task key or linked PR found" });

  await prisma.$transaction(async (tx) => {
    await tx.gitHubPullRequest.upsert({
      where: { repository_pullNumber: { repository: payload.repository.full_name, pullNumber: pr.number } },
      create: {
        taskId: task.id,
        repository: payload.repository.full_name,
        pullNumber: pr.number,
        url: pr.html_url,
        title: pr.title,
        state: pr.merged ? "merged" : pr.state,
        isDraft: pr.draft,
        headSha: pr.head.sha,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      },
      update: {
        taskId: task.id,
        url: pr.html_url,
        title: pr.title,
        state: pr.merged ? "merged" : pr.state,
        isDraft: pr.draft,
        headSha: pr.head.sha,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        lastSyncedAt: new Date(),
      },
    });
    await tx.task.update({ where: { id: task.id }, data: { repositoryUrl: pr.html_url } });
    await tx.auditEvent.create({
      data: {
        actorId: (await tx.task.findUniqueOrThrow({ where: { id: task.id }, select: { creatorId: true } })).creatorId,
        taskId: task.id,
        action: `github.pull_request.${payload.action}`,
        details: { repository: payload.repository.full_name, number: pr.number, state: pr.merged ? "merged" : pr.state, url: pr.html_url },
      },
    });
    await notifyTaskParticipants(tx, task.id, null, {
      type: "github.pull_request",
      title: `${task.key}: PR ${payload.action}`,
      message: `${payload.repository.full_name}#${pr.number} is ${pr.merged ? "merged" : pr.state}.`,
    });
  });
  return NextResponse.json({ synced: true, taskKey: task.key });
}
