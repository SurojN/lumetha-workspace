import { get } from "@vercel/blob";
import prisma from "@/lib/prisma";
import { requireCompanyMembership } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const attachment = await prisma.attachment.findUnique({ where: { id }, include: { task: { select: { project: { select: { companyId: true } } } } } });
  if (!attachment) return Response.json({ error: "Attachment not found" }, { status: 404 });
  await requireCompanyMembership(attachment.task.project.companyId);
  const blob = await get(attachment.url, { access: "private" });
  if (!blob || blob.statusCode !== 200 || !blob.stream) return Response.json({ error: "Stored file not found" }, { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "Content-Type": attachment.type ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${attachment.name.replace(/["\\]/g, "-")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
