"use client";

import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

import { CartCourseItem } from "@/types/cart";

interface CartContextValue {
  items: CartCourseItem[];
  totalAmount: number;
  addCourse: (course: CartCourseItem) => void;
  removeCourse: (courseId: string) => void;
  clearCart: () => void;
  hasCourse: (courseId: string) => boolean;
}

const CART_STORAGE_KEY = "adventskool.cart.items";

const CartContext = createContext<CartContextValue | undefined>(undefined);

function parseStoredCart(raw: string | null): CartCourseItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => typeof entry === "object" && entry !== null)
      .map((entry) => {
        const item = entry as Record<string, unknown>;
        return {
          id: String(item.id ?? ""),
          title: String(item.title ?? ""),
          thumbnailUrl: String(item.thumbnailUrl ?? ""),
          finalPrice: Number(item.finalPrice ?? 0),
        };
      })
      .filter((item) => Boolean(item.id));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartCourseItem[]>([]);

  useEffect(() => {
    const stored = parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
    queueMicrotask(() => {
      setItems(stored);
    });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const hasCourse = (courseId: string) => items.some((item) => item.id === courseId);

    return {
      items,
      totalAmount: items.reduce((sum, item) => sum + item.finalPrice, 0),
      addCourse: (course: CartCourseItem) => {
        setItems((prev) => {
          if (prev.some((item) => item.id === course.id)) return prev;
          return [...prev, course];
        });
      },
      removeCourse: (courseId: string) => {
        setItems((prev) => prev.filter((item) => item.id !== courseId));
      },
      clearCart: () => {
        setItems([]);
      },
      hasCourse,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCartContext must be used within CartProvider");
  }
  return context;
}
