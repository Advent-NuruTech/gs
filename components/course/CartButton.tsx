"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { useCart } from "@/hooks/useCart";

interface CartButtonProps {
  hideWhenEmpty?: boolean;
  className?: string;
}

export default function CartButton({ hideWhenEmpty = false, className = "" }: CartButtonProps) {
  const { items } = useCart();
  const itemCount = items.length;

  if (hideWhenEmpty && itemCount === 0) {
    return null;
  }

  return (
    <Link
      href="/checkout"
      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800 ${className}`}
      aria-label={`Cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
    >
      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white">
        {itemCount}
      </span>
    </Link>
  );
}
