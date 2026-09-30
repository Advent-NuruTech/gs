import { createServerClient } from "@supabase/ssr";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");

export const revalidate = 3600;

export async function GET() {
  const lines = [
    "# AdventSkool",
    "> AdventSkool is a Kenya focused learning platform offering online courses and practical digital products.",
    "",
    "AdventSkool helps learners discover mobile friendly courses, ebooks, guides, workbooks, templates, and other downloadable resources.",
    "",
    "## Main pages",
    `- [Home](${siteUrl}/): Overview of AdventSkool and featured learning resources.`,
    `- [Online courses](${siteUrl}/courses): Browse published courses by topic.`,
    `- [Digital products](${siteUrl}/designs): Browse ebooks, guides, templates, and downloadable resources.`,
    `- [About AdventSkool](${siteUrl}/about): Learn about the platform.`,
  ];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => [], setAll: () => {} } },
    );
    const [{ data: courses }, { data: designs }] = await Promise.all([
      supabase.from("courses").select("id, title, category").eq("published", true).order("created_at", { ascending: false }).limit(100),
      supabase.from("designs").select("id, title, category").eq("published", true).order("created_at", { ascending: false }).limit(100),
    ]);

    lines.push("", "## Published courses");
    for (const course of courses ?? []) {
      lines.push(`- [${course.title}](${siteUrl}/courses/${encodeURIComponent(course.id)}): ${course.category || "General"}.`);
    }
    lines.push("", "## Published digital products");
    for (const design of designs ?? []) {
      lines.push(`- [${design.title}](${siteUrl}/designs/${encodeURIComponent(design.id)}): ${design.category || "General"}.`);
    }
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
