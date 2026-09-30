import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

const ToastContext = createContext(null);

const makeId = () => Math.random().toString(36).slice(2);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    ({ type = "info", title, message, durationMs = 3500 } = {}) => {
      const id = makeId();
      const toast = { id, type, title: title || null, message: message || "" };
      setToasts((prev) => [toast, ...prev].slice(0, 4));
      const timer = setTimeout(() => remove(id), durationMs);
      timers.current.set(id, timer);
      return id;
    },
    [remove],
  );

  const api = useMemo(() => {
    return {
      push,
      remove,
      success: (message, opts) => push({ type: "success", message, ...opts }),
      error: (message, opts) => push({ type: "error", message, ...opts }),
      info: (message, opts) => push({ type: "info", message, ...opts }),
    };
  }, [push, remove]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed inset-x-3 bottom-3 z-[60] space-y-2 md:inset-x-auto md:right-6 md:bottom-6 md:w-[360px]">
        {toasts.map((t) => {
          const tone =
            t.type === "success"
              ? "border-teal-200 bg-teal-50 text-teal-800"
              : t.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-[rgb(var(--border))] bg-white text-[rgb(var(--foreground))]";
          return (
            <button
              key={t.id}
              type="button"
              className={`w-full rounded-lg border px-4 py-3 text-left shadow-md ${tone}`}
              onClick={() => remove(t.id)}
            >
              {t.title ? (
                <p className="text-sm font-semibold">{t.title}</p>
              ) : null}
              <p className="text-sm font-medium">{t.message}</p>
              <p className="mt-1 text-xs opacity-70">Tap to dismiss</p>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
