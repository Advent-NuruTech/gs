"use client";

import { useNotificationContext } from "@/context/NotificationContext";

const typeClassMap = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export default function Notifications() {
  const { toasts, dismissToast } = useNotificationContext();

  return (
    <div className="fixed right-4 top-4 z-[70] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[16rem] max-w-[calc(100vw-2rem)] rounded-md border px-4 py-3 text-sm shadow-sm ${typeClassMap[toast.type]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p>{toast.message}</p>
            <button type="button" onClick={() => dismissToast(toast.id)} className="font-semibold">
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
