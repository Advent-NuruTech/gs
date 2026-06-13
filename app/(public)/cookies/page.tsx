import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies Policy | Advent Skool",
  description: "Advent Skool's cookies policy — how we use cookies and similar tracking technologies, and how you can manage your preferences.",
};

const sections = [
  {
    title: "1. Introduction",
    content:
      "This Cookies Policy explains how Advent Skool ('we', 'us', or 'our') uses cookies and similar tracking technologies on our website, applications, and learning management services (the 'Platform'). It should be read together with our Privacy Policy for a complete understanding of how we handle your data. By using the Platform and, where required, by giving your consent through our cookie banner, you agree to the use of cookies as described in this policy. Our use of cookies is consistent with the EU and UK GDPR and ePrivacy rules, the CCPA/CPRA, and the Kenya Data Protection Act, 2019.",
  },
  {
    title: "2. What Are Cookies",
    content:
      "Cookies are small text files placed on your device by your web browser when you visit a website. They allow a site to remember your actions and preferences over time. We also use similar technologies such as local storage, pixels, and software development kits, which we refer to collectively as 'cookies' in this policy. Cookies may be set by us ('first-party') or by third-party services we integrate ('third-party').",
  },
  {
    title: "3. How We Use Cookies",
    content:
      "We use cookies to: authenticate your login session and keep you signed in; remember your preferences and settings; provide and secure core Platform features such as course enrollment and progress tracking; analyse how the Platform is used so we can improve it; and, where you consent, deliver and measure marketing. Some cookies are strictly necessary for the Platform to function and cannot be switched off.",
  },
  {
    title: "4. Types of Cookies We Use",
    content: "",
    subsections: [
      {
        title: "Strictly Necessary Cookies",
        content:
          "Required for the Platform to function and cannot be disabled in our systems. They enable core features such as secure login, session management, account management, and course enrollment. These are set on the basis of our legitimate interest in operating a secure and functional service.",
      },
      {
        title: "Functional Cookies",
        content:
          "Remember your preferences and settings, such as language, theme, and course progress, to provide enhanced and personalised features. Disabling these may affect the functionality of certain parts of the Platform.",
      },
      {
        title: "Analytics & Performance Cookies",
        content:
          "Help us understand how visitors interact with the Platform by collecting information such as pages visited, time spent, and navigation patterns, generally in aggregated or de-identified form. We use this to measure and improve performance and usability. These cookies are set only where permitted or with your consent.",
      },
      {
        title: "Marketing Cookies",
        content:
          "Used to deliver relevant content and advertisements and to measure the effectiveness of marketing campaigns. These may be set by us or by third-party advertising partners and are only used with your consent, which you can withdraw at any time.",
      },
    ],
  },
  {
    title: "5. Third-Party Cookies",
    content:
      "Some cookies are placed by trusted third-party services we use to operate the Platform, including our payment processor, our authentication and database provider, Google services (such as sign-in, Calendar, and Meet integrations), and analytics providers. These third parties process data under their own privacy and cookie policies, and we encourage you to review them. We do not control cookies set by third parties.",
  },
  {
    title: "6. Legal Basis for Using Cookies",
    content:
      "We rely on your consent to set non-essential cookies, including analytics and marketing cookies, where required by law. Strictly necessary cookies are used on the basis of our legitimate interest in providing a secure and functional service. You can give, refuse, or withdraw consent at any time using our cookie consent banner or your browser settings, without affecting the lawfulness of processing carried out before withdrawal.",
  },
  {
    title: "7. Managing Your Cookie Preferences",
    content:
      "When you first visit the Platform, you can set your preferences through our cookie consent banner, and you can change them at any time. You can also control or delete cookies through your browser settings; most browsers let you block or remove cookies and notify you when one is set. Please note that disabling strictly necessary cookies may prevent parts of the Platform from working correctly. For more information on managing cookies, refer to your browser's help documentation.",
  },
  {
    title: "8. Do Not Track & Global Privacy Control",
    content:
      "Some browsers offer a 'Do Not Track' (DNT) signal or a Global Privacy Control (GPC) signal. Where required by applicable law, we honour recognised opt-out preference signals such as GPC. Because there is no common industry standard for DNT, we may not respond to all DNT signals, but we continue to evaluate emerging standards and will update our practices accordingly.",
  },
  {
    title: "9. Updates to This Policy",
    content:
      "We may update this Cookies Policy from time to time to reflect changes in technology, law, or our practices. Any changes will be posted on this page with a revised 'Last updated' date, and significant changes will be communicated through a Platform notice or email. Your continued use of the Platform after changes take effect constitutes acceptance of the updated policy.",
  },
  {
    title: "10. Contact",
    content:
      "If you have questions about our use of cookies, please contact us at adventnurutech@gmail.com.",
  },
];

function SubSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-4 pl-4 border-l-2 border-primary/30">
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
      <p className="leading-relaxed text-muted-foreground">{content}</p>
    </div>
  );
}

function Section({ title, content, subsections }: { title: string; content: string; subsections?: { title: string; content: string }[] }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-foreground">{title}</h2>
      {content && <p className="leading-relaxed text-muted-foreground">{content}</p>}
      {subsections?.map((sub) => (
        <SubSection key={sub.title} title={sub.title} content={sub.content} />
      ))}
    </section>
  );
}

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
            Cookies Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: June 14, 2026</p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-primary" />
        </div>

        {/* Intro */}
        <p className="mb-10 leading-relaxed text-muted-foreground">
          This Cookies Policy explains what cookies are, how Advent Skool uses them, and how you can
          manage your preferences. This policy should be read alongside our Privacy Policy for a
          complete understanding of our data practices.
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <Section key={section.title} title={section.title} content={section.content} subsections={section.subsections} />
          ))}
        </div>
      </div>
    </main>
  );
}
