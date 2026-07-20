import { LumethaWorkspace } from "@/components/lumetha-workspace";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function Home() {
  const user = await requireUser();
  const membership = await prisma.companyMember.findFirst({
    where: { userId: user.id },
    include: { company: true },
  });
  const canReview = user.role === "senior_engineer" || user.role === "admin" || membership?.role === "company_admin";
  return <LumethaWorkspace userName={user.name ?? user.email ?? "Workspace admin"} companyId={membership?.company.id} companyName={membership?.company.name} companyDomain={membership?.company.emailDomain} canReview={canReview} />;
}
