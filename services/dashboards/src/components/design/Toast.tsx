import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

export type ToastType = "success" | "info" | "error";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  /** Show a toast. Returns the id (ignored by most callers). */
  show: (message: string, opts?: { type?: ToastType; duration?: number }) => number;
}

/** No-op fallback so components render (and tests pass) without a provider. */
const noop: ToastContextValue = { show: () => -1 };

const ToastContext = createContext<ToastContextValue>(noop);

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 3000,
  error: 5000,
};

const TOAST_ICON: Record<ToastType, Parameters<typeof Icon>[0]["name"]> = {
  success: "CheckCircle",
  info: "Info",
  error: "WarningCircle",
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, opts?: { type?: ToastType; duration?: number }) => {
      const type = opts?.type ?? "info";
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), opts?.duration ?? DEFAULT_DURATION[type]);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item toast-item--${toast.type}`}
            onClick={() => dismiss(toast.id)}
          >
            <Icon name={TOAST_ICON[toast.type]} size={16} weight="fill" />
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={(e) => {
                e.stopPropagation();
                dismiss(toast.id);
              }}
            >
              <Icon name="X" size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
