"use client";

import { ReactNode } from "react";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { NotificationProvider } from "@/context/NotificationContext";
import Notifications from "@/components/dashboard/Notifications";
import { InstallProvider } from "@/context/InstallContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <InstallProvider><AuthProvider>
      <CartProvider>
        <NotificationProvider>
          {children}
          <Notifications />
        </NotificationProvider>
      </CartProvider>
    </AuthProvider></InstallProvider>
  );
}
