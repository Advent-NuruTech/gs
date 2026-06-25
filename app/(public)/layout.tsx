import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
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
    <div className="flex min-h-screen flex-col">
      <SubscribeBanner />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
