import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import PublicNavbar from "@/components/layout/PublicNavbar";
import SubscribeBanner from "@/components/marketing/SubscribeBanner";
import { PublicDisplaySettingsProvider } from "@/context/PublicDisplaySettingsContext";

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
    <PublicDisplaySettingsProvider>
      <div className="public-shell flex min-h-screen flex-col bg-[var(--background)]">
        <div className="public-global-header">
          <SubscribeBanner />
          <PublicNavbar />
        </div>
        <div className="public-content flex-1 pb-20 md:pb-0">{children}</div>
        <Footer />
      </div>
    </PublicDisplaySettingsProvider>
  );
}
