import type { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");
const title = "Professional Digital Products — Ebooks, Guides & Templates";
const description =
  "Browse professional digital products including ebooks, guides, workbooks, templates, graphics and printable resources. Purchase once to read online or download.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "digital products",
    "ebooks",
    "professional digital products",
    "online reading",
    "business guides",
    "study guides",
    "digital workbooks",
    "printable resources",
    "professional templates",
    "graphic design Kenya",
    "AdventSkool digital products",
  ],
  alternates: { canonical: `${siteUrl}/designs` },
  openGraph: {
    type: "website",
    url: `${siteUrl}/designs`,
    title,
    description,
    siteName: "AdventSkool",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export default function DesignsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
