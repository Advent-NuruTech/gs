import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies Policy | Advent Skool",
  description: "Advent Skool's cookies policy — how we use cookies and similar tracking technologies.",
};

const sections = [
  {
    title: "What Are Cookies",
    content:
      "Cookies are small text files stored on your device by your web browser when you visit a website. They help websites remember your preferences, understand how you interact with the site, and improve your overall experience. Cookies may be set by the website you visit ('first-party') or by third-party services we integrate.",
  },
  {
    title: "How We Use Cookies",
    content:
      "We use cookies and similar tracking technologies to: authenticate your login session, remember your preferences and settings, analyse platform usage to improve our services, deliver personalised learning recommendations, and enable features like course progress tracking. Some cookies are essential for the platform to function.",
  },
  {
    title: "Types of Cookies We Use",
    content: "",
    subsections: [
      {
        title: "Essential Cookies",
        content:
          "Required for the platform to function. These enable core features like secure login, account management, and course enrollment. Without these cookies, certain services cannot be provided.",
      },
      {
        title: "Functional Cookies",
        content:
          "Remember your preferences and settings, such as language selection, theme preferences, and course progress. These enhance your experience but are not strictly necessary.",
      },
      {
        title: "Analytics Cookies",
        content:
          "Help us understand how users interact with Advent Skool by collecting anonymised data on page visits, time spent, and navigation patterns. We use this data to improve platform usability and performance.",
      },
      {
        title: "Marketing Cookies",
        content:
          "Used to deliver relevant advertisements and measure the effectiveness of our marketing campaigns. These may be set by third-party advertising partners with your consent.",
      },
    ],
  },
  {
    title: "Third-Party Cookies",
    content:
      "Some cookies are placed by trusted third-party services we use, including Paystack (payment processing), Supabase (authentication and database), and analytics providers. These third parties have their own cookie policies. We encourage you to review them.",
  },
  {
    title: "Managing Cookies",
    content:
      "You can control and manage cookies through your browser settings. Most browsers allow you to block or delete cookies. Please note that disabling essential cookies may affect platform functionality. You can also opt out of analytics cookies through our cookie consent banner.",
  },
  {
    title: "Your Consent",
    content:
      "When you first visit Advent Skool, you will see a cookie consent banner. By clicking 'Accept' or continuing to use the platform, you consent to the use of cookies as described in this policy. You can change your preferences at any time through your browser settings.",
  },
  {
    title: "Do Not Track Signals",
    content:
      "Advent Skool currently does not respond to 'Do Not Track' (DNT) signals. We continue to evaluate emerging standards and may update this practice as industry standards evolve.",
  },
  {
    title: "Updates to This Policy",
    content:
      "We may update this Cookies Policy periodically. Changes will be posted on this page with an updated 'Last updated' date. Significant changes will be communicated via platform notice or email.",
  },
  {
    title: "Contact",
    content:
      "If you have questions about our use of cookies, please contact us at privacy@adventskool.com.",
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
          <p className="text-sm text-muted-foreground">Last updated: June 12, 2026</p>
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
