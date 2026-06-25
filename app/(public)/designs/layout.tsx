import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skills.adventnurutech.xyz";
const title = "Design Marketplace — Thumbnails, Posters, Flyers & Banners";
const description =
  "Browse high-quality YouTube thumbnails, event posters, church & business flyers, social media banners, conference posters, certificates, and marketing graphics. Free to browse — get any design customized for you.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "design marketplace",
    "YouTube thumbnails",
    "event posters",
    "church flyers",
    "business flyers",
    "social media banners",
    "conference posters",
    "certificates",
    "marketing graphics",
    "graphic design Kenya",
    "custom flyer design",
    "poster design",
    "AdventSkool designs",
  ],
  alternates: { canonical: `${siteUrl}/designs` },
  openGraph: {
    type: "website",
    url: `${siteUrl}/designs`,
    title,
    description,
    siteName: "AdventSkool",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export default function DesignsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
