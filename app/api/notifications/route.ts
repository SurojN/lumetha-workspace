import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    include: { task: { select: { key: true, title: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(notifications);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { id?: string; all?: boolean };
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(body.all ? {} : { id: body.id ?? "" }) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ success: true });
}
