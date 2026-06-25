import type { Metadata } from "next";
import ForgotPasswordPageClient from "@/components/auth/ForgotPasswordPageClient";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your AdventSkool account password. Enter your email and we'll send you a reset link.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
