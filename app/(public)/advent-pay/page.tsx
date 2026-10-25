import { redirect } from "next/navigation";

/** Legacy URL kept only so old links reach the standalone AdventPay product. */
export default function LegacyAdventPayPage() { redirect("/adventpay"); }
