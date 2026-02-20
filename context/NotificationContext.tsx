"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface NotificationContextValue {
  toasts: Toast[];
  pushToast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo(
    () => ({
      toasts,
      pushToast: (message: string, type: Toast["type"] = "info") => {
        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 4000);
      },
      dismissToast: (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      },
    }),
    [toasts],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider",
    );
  }
  return context;
}
