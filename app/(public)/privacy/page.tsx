import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Advent Skool",
  description: "Advent Skool's privacy policy — how we collect, use, and protect your personal data.",
};

const sections = [
  {
    title: "Information We Collect",
    content:
      "We collect information you provide when creating an account, enrolling in courses, or contacting support. This includes your name, email address, phone number, payment details, and profile information. We also automatically collect usage data such as IP address, browser type, device information, and how you interact with our platform.",
  },
  {
    title: "How We Use Your Information",
    content:
      "Your information is used to deliver and improve our educational services, process transactions, send course updates, provide support, personalise your learning experience, and communicate important platform changes. We may also use aggregated data for analytics and platform improvement.",
  },
  {
    title: "Payment Processing",
    content:
      "All payments are securely processed by Paystack, our third-party payment processor. We do not store full credit card details on our servers. Paystack handles all sensitive payment data in compliance with PCI-DSS standards.",
  },
  {
    title: "Data Sharing & Disclosure",
    content:
      "We do not sell your personal data. We may share information with trusted service providers who help us operate the platform (hosting, analytics, payment processing) under strict confidentiality agreements. We may disclose information if required by law or to protect our legal rights.",
  },
  {
    title: "Data Retention",
    content:
      "We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting our support team.",
  },
  {
    title: "Your Rights",
    content:
      "Depending on your jurisdiction, you may have the right to access, correct, delete, or port your personal data. You can update your information in your account settings. For additional requests, please contact us at privacy@adventskool.com.",
  },
  {
    title: "Security",
    content:
      "We implement industry-standard security measures including encryption in transit (TLS 1.3), secure data storage, and regular security audits to protect your personal information from unauthorised access or disclosure.",
  },
  {
    title: "Third-Party Links",
    content:
      "Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal data.",
  },
  {
    title: "Children's Privacy",
    content:
      "Advent Skool is not intended for children under 13 without parental consent. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us immediately.",
  },
  {
    title: "Changes to This Policy",
    content:
      "We may update this Privacy Policy from time to time. Material changes will be notified via email or platform notice. Continued use of the platform after changes constitutes acceptance of the updated policy.",
  },
  {
    title: "Contact Us",
    content:
      'If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at privacy@adventskool.com or write to: Advent Skool, Data Protection Team.',
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

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: June 12, 2026</p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-primary" />
        </div>

        {/* Intro */}
        <p className="mb-10 leading-relaxed text-muted-foreground">
          At Advent Skool, we take your privacy seriously. This Privacy Policy explains how we
          collect, use, disclose, and safeguard your personal information when you use our learning
          management platform. By using Advent Skool, you consent to the practices described in this
          policy.
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
