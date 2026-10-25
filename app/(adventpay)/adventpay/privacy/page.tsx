import type { Metadata } from "next";

import AdventPayLegalPage from "@/components/adventpay/AdventPayLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AdventPay handles account, invoice, payment, and receipt information.",
};

const sections = [
  {
    title: "1. Scope",
    content: <p>This Privacy Policy explains how AdventPay, operated by Advent NuruTech Services, collects and uses personal information when you use its invoices, payment flows, notifications, and receipt downloads. It applies to AdventPay separately from the broader AdventSkool learning-platform privacy policy.</p>,
  },
  {
    title: "2. Information we process",
    content: <p>We process account details such as your name, email address, and optional phone number; invoice information such as descriptions, amounts, dates, and payment method; payment references and confirmation status; receipt details; and limited technical information needed to operate, secure, and troubleshoot the service. We do not store full card details.</p>,
  },
  {
    title: "3. Why we use information",
    content: <p>We use this information to authenticate you, issue and display invoices, process or confirm payments, create receipts, deliver invoice and payment notifications, provide support, prevent fraud, maintain records, and comply with legal and tax obligations. Processing is based on providing the service you request, our legitimate interests in secure operations, and legal obligations where applicable.</p>,
  },
  {
    title: "4. Payments and service providers",
    content: <p>Online payments are processed by Paystack. When you choose Paystack, its processing of your payment information is governed by its privacy policy and terms. We may also use trusted providers for hosting, authentication, database operations, communications, and security. They may process information only as needed to provide those services or meet legal obligations.</p>,
  },
  {
    title: "5. Sharing and retention",
    content: <p>We do not sell your personal information. We share it only with service providers, payment processors, administrators who manage your invoices, and authorities where required by law or needed to protect rights and security. We retain invoice, payment, and receipt records for as long as needed for service delivery, audit, dispute resolution, fraud prevention, and legal obligations.</p>,
  },
  {
    title: "6. Your choices and rights",
    content: <p>Depending on applicable law, you may request access to, correction of, or deletion of your personal information, object to certain processing, or ask for a copy of your data. Some invoice and payment records must be retained even when an account is closed. To make a request or ask a privacy question, email adventskool@gmail.com.</p>,
  },
  {
    title: "7. Security and changes",
    content: <p>We use reasonable technical and organisational safeguards, including encrypted connections and access controls. No service can guarantee absolute security. We may update this Policy as AdventPay evolves or legal requirements change; the current version and its update date will always be published on this page.</p>,
  },
];

export default function AdventPayPrivacyPage() {
  return <AdventPayLegalPage title="Privacy Policy" summary="How AdventPay handles the information needed for your account, invoices, payments, and receipts." sections={sections} />;
}
