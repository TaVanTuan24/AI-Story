"use client";

import { createContext, useContext, useState } from "react";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone?: "info" | "success" | "error";
};

const ToastContext = createContext<{
  push: (toast: Omit<Toast, "id">) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function push(toast: Omit<Toast, "id">) {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, 3600);
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-[1.5rem] border px-4 py-4 shadow-lg backdrop-blur ${
              toast.tone === "error"
                ? "status-danger"
                : toast.tone === "success"
                  ? "status-success"
                  : "status-info"
            }`}
          >
            <p className="font-semibold text-[color:var(--text-primary)]">
              {toast.title}
            </p>
            {toast.description ? (
              <p className="mt-1 text-sm leading-6 text-[color:var(--text-secondary)]">
                {toast.description}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}
