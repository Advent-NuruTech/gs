import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/api/",
          "/auth/",
          "/invite/",
          "/checkout/",
        ],
      },
      ...["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot"].map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/auth/", "/invite/", "/checkout/"],
      })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
