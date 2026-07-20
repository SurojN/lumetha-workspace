import { SetupPasswordForm } from "./setup-password-form";

export default async function SetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="grid min-h-dvh place-items-center bg-[#f4f7f4] p-5"><SetupPasswordForm token={token} /></main>;
}
