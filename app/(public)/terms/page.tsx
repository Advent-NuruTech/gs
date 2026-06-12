import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Advent Skool",
  description: "Advent Skool's terms and conditions governing the use of our learning management platform.",
};

const sections = [
  {
    title: "Acceptance of Terms",
    content:
      "By accessing or using Advent Skool, you agree to be bound by these Terms & Conditions. If you do not agree, you may not use the platform. We reserve the right to update these terms at any time, and continued use constitutes acceptance of any changes.",
  },
  {
    title: "Account Registration",
    content:
      "You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. Notify us immediately of any unauthorised use.",
  },
  {
    title: "User Conduct",
    content:
      "You agree to use Advent Skool for lawful purposes only. You may not: harass other users, upload malicious content, infringe on intellectual property rights, attempt to access restricted areas, or disrupt platform operations. Violations may result in account suspension or termination.",
  },
  {
    title: "Course Enrollment & Access",
    content:
      "Enrolling in a course grants you a limited, non-transferable licence to access the content for personal educational use. You may not redistribute, resell, or publicly share course materials without written permission. Access duration depends on the specific course terms at time of purchase.",
  },
  {
    title: "Payments & Refunds",
    content:
      "All payments are processed securely via Paystack. Prices are listed in the currency specified at checkout. Refund policies are outlined on each course's page and at the time of purchase. We reserve the right to change pricing with reasonable notice.",
  },
  {
    title: "Intellectual Property",
    content:
      "All content on Advent Skool — including course materials, videos, text, graphics, logos, and software — is the property of Advent Skool or its licensors and is protected by copyright and other intellectual property laws. Unauthorised use is strictly prohibited.",
  },
  {
    title: "Free & Paid Accounts",
    content:
      "Advent Skool may offer both free and paid account tiers. Free accounts are subject to feature limitations as described on our pricing page. We reserve the right to modify or discontinue any tier with reasonable notice.",
  },
  {
    title: "Limitation of Liability",
    content:
      "Advent Skool is provided 'as is' without warranties of any kind. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including loss of data or learning progress.",
  },
  {
    title: "Termination",
    content:
      "We may suspend or terminate your account at any time for violation of these terms, fraudulent activity, or conduct that harms the platform or other users. You may also delete your account at any time through your account settings.",
  },
  {
    title: "Governing Law",
    content:
      "These Terms & Conditions are governed by the laws of Nigeria. Any disputes arising from these terms shall be resolved in the courts of Nigeria. We make no representation that the platform is appropriate for use in locations outside Nigeria.",
  },
  {
    title: "Contact",
    content:
      "For questions about these Terms & Conditions, please contact us at support@adventskool.com.",
  },
];

function Section({ title, content }: { title: string; content: string }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-foreground">{title}</h2>
      <p className="leading-relaxed text-muted-foreground">{content}</p>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
            Terms & Conditions
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: June 12, 2026</p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-primary" />
        </div>

        {/* Intro */}
        <p className="mb-10 leading-relaxed text-muted-foreground">
          Welcome to Advent Skool. These Terms & Conditions govern your access to and use of our
          learning management platform. Please read them carefully before creating an account or
          enrolling in any course.
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <Section key={section.title} title={section.title} content={section.content} />
          ))}
        </div>
      </div>
    </main>
  );
}
