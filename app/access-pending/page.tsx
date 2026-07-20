import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Clock3, LockKeyhole, Sunrise } from "lucide-react";

export default async function AccessPendingPage() {
  const user = await requireUser();
  const membership = await prisma.companyMember.findFirst({ where: { userId: user.id } });
  if (user.role !== "pending" && membership) redirect("/");
  return <main className="grid min-h-screen place-items-center bg-[#f5f8f5] p-5"><section className="w-full max-w-lg rounded-3xl border border-[#dde5df] bg-white p-8 text-center shadow-[0_18px_50px_rgba(25,55,40,.08)] sm:p-10"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white"><Sunrise className="h-6 w-6" /></span><div className="mx-auto mt-7 grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-700"><LockKeyhole className="h-6 w-6" /></div><h1 className="mt-5 text-2xl font-semibold tracking-tight">Workspace access pending</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#6d7971]">Your account exists, but no workspace role has been granted. Ask a Lumetha administrator to approve <strong className="font-semibold text-[#334139]">{user.email}</strong>.</p><div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#f5f7f5] px-4 py-3 text-xs text-[#637067]"><Clock3 className="h-4 w-4" />Sign back in after an administrator assigns your role.</div><form action={logout}><button className="mt-7 rounded-xl border border-[#d9e1db] px-5 py-2.5 text-sm font-medium text-[#536159] hover:bg-[#f4f6f4]">Sign out</button></form></section></main>;
}

