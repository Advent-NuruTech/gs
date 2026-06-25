import type { Metadata } from "next";
import ResetPasswordPageClient from "@/components/auth/ResetPasswordPageClient";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your AdventSkool account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}
