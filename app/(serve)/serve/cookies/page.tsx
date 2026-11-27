import type { Metadata } from "next";
import ServeLegalPage from "@/components/serve/ServeLegalPage";

export const metadata: Metadata = {
  title: "Cookies Policy | SERVE* If Saved",
  description: "How cookies and similar technologies are used on SERVE* If Saved.",
};

const sections = [
  {
    title: "1. What cookies are",
    content:
      "Cookies are small files saved by a website in your browser. Similar technologies, including browser storage and security tools, can remember settings or help a service operate. This policy describes their use on SERVE* If Saved.",
  },
  {
    title: "2. Essential operation and security",
    content:
      "The website and its shared hosting or security services may use strictly necessary cookies or similar technologies to deliver pages, protect the service, and support essential platform functions. These are not used by SERVE to create advertising profiles. Blocking essential technologies in your browser may affect how parts of the website work.",
  },
  {
    title: "3. Preferences and third-party websites",
    content:
      "Your browser may store basic preferences locally. SERVE* If Saved does not intentionally set advertising cookies on these pages. Links to AdventSkool or other third-party websites may use their own cookies and tracking technologies, which are governed by their respective policies.",
  },
  {
    title: "4. Managing cookies",
    content:
      "You can review, block, or delete cookies using your browser settings. The steps vary by browser, and disabling necessary cookies may prevent some features from working. If non-essential technologies are introduced in the future, this policy will be updated and any required consent will be requested.",
  },
  {
    title: "5. Changes and contact",
    content:
      "We may update this policy as the website or applicable requirements change. The updated date will appear at the top of this page. For questions about cookies or privacy, contact adventskool@gmail.com or call +254 142 225 233.",
  },
];

export default function ServeCookiesPage() {
  return (
    <ServeLegalPage
      title="Cookies Policy"
      intro="This policy explains how cookies and similar technologies may be used to operate and protect the SERVE* If Saved website."
      sections={sections}
    />
  );
}
