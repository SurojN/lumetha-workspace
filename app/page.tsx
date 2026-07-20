import { LumethaWorkspace } from "@/components/lumetha-workspace";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function Home() {
  const user = await requireUser();
  const membership = await prisma.companyMember.findFirst({
    where: { userId: user.id },
    include: { company: { include: { projects: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 } } } },
  });
  const canReview = user.role === "senior_engineer" || user.role === "admin" || membership?.role === "company_admin";
  const workspaceRole = membership?.role === "company_admin" ? "admin" : user.role;
  return <LumethaWorkspace userName={user.name ?? user.email ?? "Workspace admin"} companyId={membership?.company.id} projectId={membership?.company.projects[0]?.id} companyName={membership?.company.name} companyDomain={membership?.company.emailDomain} canReview={canReview} role={workspaceRole} />;
}
