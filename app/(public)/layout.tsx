import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import PublicNavbar from "@/components/layout/PublicNavbar";
import SubscribeBanner from "@/components/marketing/SubscribeBanner";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
  },
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="public-shell flex min-h-screen flex-col bg-[var(--background)]">
      <SubscribeBanner />
      <PublicNavbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
