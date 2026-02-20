"use client";

import Link from "next/link";

import { useCart } from "@/hooks/useCart";

export default function CartButton() {
  const { items } = useCart();

  return (
    <Link
      href="/checkout"
      className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      Cart ({items.length})
    </Link>
  );
}
