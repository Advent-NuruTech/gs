import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Payout Agreement | AdventSkool",
  description: "Standard commission, payment processing, and payout terms for AdventSkool creators.",
};

const sections = [
  {
    title: "Standard commission",
    content: "AdventSkool's standard platform commission is 10% of the customer payment for each eligible course sale. The remainder, after applicable payment processing fees, is allocated to the creator. Any creator-specific rate shown in the payout dashboard replaces the standard rate for future checkouts.",
  },
  {
    title: "Payment processing fees",
    content: "The standard fee mode is exclusive: Paystack's transaction processing fee is borne by the creator and is separate from AdventSkool's 10% commission. Paystack determines the processing fee. The checkout amount paid by the customer is not increased by this agreement. The fee and the commission rate applicable to a sale are recorded with that payment and later settings changes do not change past sales.",
  },
  {
    title: "Payout routing and settlement",
    content: "After a successful payment, AdventSkool records the sale and routes eligible creator shares through the creator's verified Paystack subaccount. A sale marked as routed means Paystack accepted the split instruction; it does not confirm that funds have settled to the creator's bank. Settlement follows Paystack's schedule and is subject to Paystack, bank, and applicable legal requirements. Sales made before payout verification are not transferred automatically through this split arrangement.",
  },
  {
    title: "Creator responsibilities",
    content: "Creators must provide accurate account and contact information, keep their course content and sales claims lawful and accurate, and handle any taxes or other obligations applicable to their earnings. AdventSkool stores only the payout information described in its privacy and payout notices; full bank account numbers are sent to Paystack for subaccount registration and are not retained by AdventSkool.",
  },
  {
    title: "Special arrangements and support",
    content: "Creators may contact AdventSkool to request a special commission rate or fee arrangement. A special arrangement is effective only after AdventSkool confirms it in writing and the applicable rate and fee mode are saved to the creator's settings. Contact adventskool@gmail.com with the subject 'Creator payout special deal'.",
  },
];

export default function CreatorPayoutAgreementPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Creator programme</p>
        <h1 className="text-3xl font-bold text-slate-950">Creator payout agreement</h1>
        <p className="text-slate-600">These standard terms describe how AdventSkool commissions and creator payouts work for course sales.</p>
      </header>
      <div className="space-y-5 rounded-2xl border bg-white p-5 sm:p-7">
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <p className="text-sm leading-6 text-slate-600">{section.content}</p>
          </section>
        ))}
        <p className="border-t pt-4 text-xs leading-5 text-slate-500">This page summarizes the standard payout arrangement and does not replace any written special arrangement or applicable law. Questions: <a className="font-semibold text-blue-700 underline" href="mailto:adventskool@gmail.com">adventskool@gmail.com</a>.</p>
      </div>
    </main>
  );
}
