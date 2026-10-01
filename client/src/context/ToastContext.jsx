import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '../utils/format.js';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: TriangleAlert, info: Info };
const TONES = {
  success: 'border-emerald-500/30 text-emerald-300',
  error: 'border-crimson-500/40 text-crimson-400',
  info: 'border-gold-500/30 text-gold-300',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message, opts = {}) => {
      if (!message) return;
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, type, message, title: opts.title }]);
      setTimeout(() => dismiss(id), opts.duration ?? 4200);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      info: (m, o) => push('info', m, o),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                role={t.type === 'error' ? 'alert' : 'status'}
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-ink-850/95 px-4 py-3 shadow-2xl backdrop-blur',
                  TONES[t.type]
                )}
              >
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1 text-sm text-fog-100">
                  {t.title && <p className="font-semibold">{t.title}</p>}
                  <p className="break-words text-fog-200">{t.message}</p>
                </div>
                <button onClick={() => dismiss(t.id)} className="rounded p-1 text-fog-400 hover:text-fog-100" aria-label="Dismiss notification">
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
