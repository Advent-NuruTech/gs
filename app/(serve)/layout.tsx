import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { absolute: "SERVE* If Saved" },
  description: "A Scripture-first learning journey from SERVE* If Saved.",
  manifest: "https://serve.adventskool.co.ke/serve.webmanifest",
  icons: {
    icon: [
      { url: "/images/serve/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/serve/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/images/serve/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "SERVE",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    siteName: "SERVE* If Saved",
    title: "SERVE* If Saved",
    description: "A Scripture-first learning journey from SERVE* If Saved.",
    url: "https://serve.adventskool.co.ke/",
  },
  twitter: {
    card: "summary",
    title: "SERVE* If Saved",
    description: "A Scripture-first learning journey from SERVE* If Saved.",
  },
};

export const viewport: Viewport = {
  themeColor: "#06182b",
};

export default function ServeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
