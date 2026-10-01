import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Creator | AdventSkool",
  description: "Apply to teach, sell learning products, and earn as an AdventSkool creator.",
};

export default function StandaloneLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-white text-slate-900">{children}</div>;
}
