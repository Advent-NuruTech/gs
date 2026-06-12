"use client";

import { ReactNode } from "react";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { NotificationProvider } from "@/context/NotificationContext";
import Notifications from "@/components/dashboard/Notifications";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <NotificationProvider>
          {children}
          <Notifications />
        </NotificationProvider>
      </CartProvider>
    </AuthProvider>
  );
}
