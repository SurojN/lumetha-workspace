import { createCompany } from "@/app/actions/company";
import { requireUser } from "@/lib/auth";
import { userHasRole } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function CompanyOnboarding() {
  const user = await requireUser();
  if (!(await userHasRole(user.id, ["admin"], user.role))) redirect("/access-pending");
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <form
        action={createCompany}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      >
        <h1 className="text-2xl font-semibold">Set up a client company</h1>
        <p className="mt-2 text-sm text-slate-500">
          Only Lumetha administrators can create and configure company
          workspaces.
        </p>
        <label className="mt-6 block text-sm font-medium">
          Company name
          <input
            required
            name="name"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Acme Inc."
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Allowed email domain{" "}
          <span className="font-normal text-slate-400">(optional)</span>
          <input
            name="emailDomain"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="acme.com"
          />
        </label>
        <button className="mt-6 w-full rounded-lg bg-[#1D4B3B] px-4 py-2.5 font-medium text-white">
          Create company as {user.email}
        </button>
      </form>
    </main>
  );
}
