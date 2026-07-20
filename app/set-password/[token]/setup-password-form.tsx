"use client";

import { useActionState } from "react";
import { setAccountPassword, type SetPasswordState } from "./actions";

export function SetupPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setAccountPassword, undefined);
  return (
    <form action={action} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <input type="hidden" name="token" value={token} />
      <div className="mb-6 grid h-10 w-10 place-items-center rounded-xl bg-[#1D4B3B] font-bold text-white">L</div>
      <h1 className="text-2xl font-semibold text-slate-900">Set your private password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">This one-time link expires after 24 hours. Your password is hashed and is never visible to Lumetha administrators.</p>
      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">New password<input name="password" type="password" minLength={10} required autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-slate-700">Confirm password<input name="confirmation" type="password" minLength={10} required autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      </div>
      {state?.error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}
      <button disabled={pending} className="mt-6 w-full rounded-lg bg-[#1D4B3B] px-4 py-2.5 font-medium text-white disabled:opacity-60">{pending ? "Saving…" : "Set password"}</button>
    </form>
  );
}
