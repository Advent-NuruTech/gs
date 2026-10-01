import type { Metadata } from "next";
import "@/styles/globals.css";
import AppProviders from "@/context/AppProviders";
import RouteProgress from "@/components/ui/RouteProgress";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AdventSkool | Online Courses and Digital Products in Kenya",
    template: "%s | AdventSkool",
  },
  description:
    "Discover practical online courses, ebooks, guides, workbooks, templates, and digital products from AdventSkool. Learn at your pace with mobile-friendly lessons.",
  keywords: [
    "online courses Kenya",
    "digital products Kenya",
    "ebooks and learning resources",
    "online learning",
    "AdventSkool",
    "education platform",
    "e-learning",
  ],
  authors: [{ name: "Advent NuruTech" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AdventSkool",
    title: "AdventSkool | Online Courses and Digital Products in Kenya",
    description:
      "Discover practical online courses, ebooks, guides, workbooks, templates, and digital products from AdventSkool.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "AdventSkool | Online Courses and Digital Products in Kenya",
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
        <AppProviders>
          <RouteProgress />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
