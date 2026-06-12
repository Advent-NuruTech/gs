"use client";

import Link from "next/link";

import { useCart } from "@/hooks/useCart";

interface CartButtonProps {
  hideWhenEmpty?: boolean;
}

export default function CartButton({ hideWhenEmpty = false }: CartButtonProps) {
  const { items } = useCart();
  const itemCount = items.length;

  if (hideWhenEmpty && itemCount === 0) {
    return null;
  }

  return (
    <Link
      href="/checkout"
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      aria-label={`Cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-700" fill="none" aria-hidden="true">
        <path
          d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 .98-.78L20 7H7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="19" r="1.6" fill="currentColor" />
        <circle cx="17" cy="19" r="1.6" fill="currentColor" />
      </svg>
      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white">
        {itemCount}
      </span>
    </Link>
  );
}
