import type { Metadata } from "next";

import AdventPayLegalPage from "@/components/adventpay/AdventPayLegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing use of AdventPay invoices, payments, and receipts.",
};

const sections = [
  {
    title: "1. Agreement and service",
    content: <p>These AdventPay Terms of Service govern your use of AdventPay, the invoicing, payment, notification, and receipt service operated by Advent NuruTech Services. By creating an account, viewing an invoice, or using AdventPay, you agree to these Terms and the AdventPay Privacy Policy. If you do not agree, do not use the service.</p>,
  },
  {
    title: "2. Account responsibility",
    content: <p>You must provide accurate, current account information and keep your sign-in credentials confidential. You are responsible for activity on your account and for notifying us promptly at adventskool@gmail.com if you believe it has been accessed without permission.</p>,
  },
  {
    title: "3. Invoices and payment",
    content: <><p>Invoices are issued by AdventPay administrators to the registered account shown on the invoice. You are responsible for checking the description, amount, due date, and payment instructions before paying.</p><p>Where an invoice supports online payment, Paystack processes that payment under its own terms and privacy policy. Where an invoice provides Till instructions, a receipt is issued only after AdventPay confirms the payment. Do not send payment credentials or card details to AdventPay support.</p></>,
  },
  {
    title: "4. Recurring invoices",
    content: <p>Recurring invoices are issued on the schedule shown on the invoice. Paying late does not move future due dates, and an overdue invoice remains separately payable until settled or cancelled. AdventPay does not automatically charge a payment method for recurring invoices unless that capability is clearly presented to you at payment.</p>,
  },
  {
    title: "5. Receipts, corrections, and cancellations",
    content: <p>PDF receipts are available after a Paystack payment is confirmed or an administrator confirms a Till payment. Keep your payment reference and receipt for your records. Contact support promptly if you believe an invoice, receipt recipient detail, or payment status is incorrect. Unpaid invoices may be cancelled by AdventPay; paid financial records are retained for audit and legal obligations.</p>,
  },
  {
    title: "6. Acceptable use and availability",
    content: <p>You must not interfere with the service, attempt unauthorised access, use AdventPay for fraud or unlawful activity, or misrepresent payments or receipts. We may suspend or restrict access where reasonably necessary for security, fraud prevention, legal compliance, or a breach of these Terms. AdventPay is provided on an &quot;as available&quot; basis, subject to applicable law.</p>,
  },
  {
    title: "7. Changes, governing law, and contact",
    content: <p>We may update these Terms to reflect service, operational, or legal changes. Material changes will be posted here with a revised date. These Terms are governed by the laws of the Republic of Kenya, subject to mandatory consumer protections. Questions about AdventPay can be sent to adventskool@gmail.com.</p>,
  },
];

export default function AdventPayTermsPage() {
  return <AdventPayLegalPage title="Terms of Service" summary="The terms that apply specifically to AdventPay invoices, payments, notifications, and downloadable receipts." sections={sections} />;
}
