import { LumethaWorkspace } from "@/components/lumetha-workspace";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { rolesForUser } from "@/lib/roles";

export default async function Home() {
  const user = await requireUser();
  const membership = await prisma.companyMember.findFirst({
    where: { userId: user.id },
    include: { company: { include: { projects: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 } } } },
  });
  const roles = await rolesForUser(user.id, user.role);
  if (user.role === "pending" || !membership) redirect("/access-pending");
  if (roles.includes("admin")) redirect("/admin");
  if (roles.includes("client")) redirect("/client");
  const canReview = roles.includes("senior_engineer") || membership?.role === "company_admin";
  const workspaceRole = membership?.role === "company_admin" ? "admin" : user.role;
  return <LumethaWorkspace userName={user.name ?? user.email ?? "Workspace admin"} companyId={membership?.company.id} projectId={membership?.company.projects[0]?.id} companyName={membership?.company.name} companyDomain={membership?.company.emailDomain} canReview={canReview} role={workspaceRole} />;
}
