import type { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");
const title = "Wealth Academy — Money, Wealth Building & Generational Legacy";
const description =
  "Learn how money works, how to preserve and grow wealth, and how to end generational poverty. Browse practical ebooks, guides and workbooks on budgeting, saving, investing, legacy and family wealth.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "wealth academy",
    "how to build wealth",
    "wealth preservation",
    "wealth generation",
    "money management",
    "personal finance Kenya",
    "budgeting and saving",
    "investing basics",
    "generational wealth",
    "end generational poverty",
    "family wealth planning",
    "financial literacy",
    "AdventSkool wealth",
  ],
  alternates: { canonical: `${siteUrl}/wealth` },
  openGraph: {
    type: "website",
    url: `${siteUrl}/wealth`,
    title,
    description,
    siteName: "AdventSkool",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export default function WealthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
