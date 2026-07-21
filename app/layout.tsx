import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://workspace.lumetha.com"),
  title: {
    default: "Lumetha Workspace",
    template: "%s · Lumetha Workspace",
  },
  description:
    "The delivery workspace behind Lumetha's Daybreak Engine—from client brief to senior-reviewed dawn handoff.",
  applicationName: "Lumetha Workspace",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
