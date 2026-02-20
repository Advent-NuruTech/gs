import type { Metadata } from "next";
import "@/styles/globals.css";
import AppProviders from "@/context/AppProviders";

export const metadata: Metadata = {
  title: "AdventSkool LMS",
  description: "Production-ready scalable LMS powered by Next.js + Firebase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
