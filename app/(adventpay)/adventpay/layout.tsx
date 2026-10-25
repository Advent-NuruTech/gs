import type { Metadata } from "next";
import AdventPayFooter from "@/components/adventpay/AdventPayFooter";
import AdventPayHeader from "@/components/adventpay/AdventPayHeader";

export const metadata: Metadata = {
  title: { default: "AdventPay", template: "%s | AdventPay" },
  description: "Focused invoices, secure payments, and professional PDF receipts.",
  applicationName: "AdventPay",
  openGraph: { title: "AdventPay", description: "Focused invoices, secure payments, and professional PDF receipts.", siteName: "AdventPay" },
};

export default function AdventPayLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950"><AdventPayHeader /><main className="flex-1">{children}</main><AdventPayFooter /></div>;
}
