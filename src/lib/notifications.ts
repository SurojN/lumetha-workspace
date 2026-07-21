import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function notifyTaskParticipants(
  db: DbClient,
  taskId: string,
  actorId: string | null,
  notification: { type: string; title: string; message: string },
) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { creatorId: true, assigneeId: true, reviewerId: true },
  });
  if (!task) return;
  const recipients = [...new Set([task.creatorId, task.assigneeId, task.reviewerId])]
    .filter((id): id is string => Boolean(id) && id !== actorId);
  if (!recipients.length) return;
  await db.notification.createMany({
    data: recipients.map((userId) => ({ userId, taskId, ...notification })),
  });
}
