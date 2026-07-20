"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, register, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? login : register;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);
  const isRegister = mode === "register";
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
    <form action={formAction} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-7"><div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#202b4b] font-bold text-white">L</div><h1 className="text-2xl font-semibold">{isRegister ? "Request an account" : "Welcome back"}</h1><p className="mt-1 text-sm text-slate-500">{isRegister ? "Create your login, then ask a Lumetha admin to grant workspace access." : "Sign in to your approved Lumetha workspace."}</p></div>
      <div className="space-y-4">
        {isRegister && <label className="block text-sm font-medium">Name<input required name="name" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" autoComplete="name" /></label>}
        <label className="block text-sm font-medium">Work email<input required name="email" type="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" autoComplete="email" /></label>
        <label className="block text-sm font-medium">Password<input required name="password" type="password" minLength={10} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" autoComplete={isRegister ? "new-password" : "current-password"} /></label>
      </div>
      {state?.error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{state.error}</p>}
      <button disabled={pending} className="mt-6 w-full rounded-lg bg-[#202b4b] px-4 py-2.5 font-medium text-white disabled:opacity-60">{pending ? "Please wait…" : isRegister ? "Create access request" : "Sign in"}</button>
      <p className="mt-5 text-center text-sm text-slate-500">{isRegister ? "Already have an account?" : "New to Lumetha?"} <Link className="font-medium text-[#334a87]" href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
    </form>
  </main>;
}
