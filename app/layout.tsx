import type { Metadata } from "next";
import "@/styles/globals.css";
import AppProviders from "@/context/AppProviders";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AdventSkool — Mobile-First Learning Management Platform",
    template: "%s | AdventSkool",
  },
  description:
    "AdventSkool is a mobile-first learning management platform offering structured courses, progress tracking, quizzes, and role-based dashboards for students, teachers, and admins.",
  keywords: [
    "LMS",
    "learning management system",
    "online courses",
    "mobile learning",
    "AdventSkool",
    "education platform",
    "e-learning",
  ],
  authors: [{ name: "Advent NuruTech" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AdventSkool",
    title: "AdventSkool — Mobile-First Learning Management Platform",
    description:
      "AdventSkool is a mobile-first learning management platform offering structured courses, progress tracking, quizzes, and role-based dashboards for students, teachers, and admins.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "AdventSkool — Mobile-First Learning Management Platform",
    description:
      "AdventSkool is a mobile-first learning management platform offering structured courses, progress tracking, quizzes, and role-based dashboards.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
