import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/format.js';
import { Button } from './Button.jsx';

function useDialogBehaviour(open, onClose, panelRef) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && panelRef.current) {
        // Focus trap
        const nodes = panelRef.current.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => panelRef.current?.querySelector('input,select,textarea,button')?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, panelRef]);
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();
  useDialogBehaviour(open, onClose, ref);
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn('relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-white/10 bg-ink-900 shadow-2xl sm:rounded-2xl', widths[size])}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold text-fog-100">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-fog-400">{description}</p>}
              </div>
              <button onClick={onClose} className="-mr-2 rounded-lg p-2 text-fog-400 hover:bg-white/5 hover:text-fog-100" aria-label="Close dialog">
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-white/5 px-5 py-4 safe-bottom sm:px-6">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function Drawer({ open, onClose, title, children, side = 'right' }) {
  const ref = useRef(null);
  const titleId = useId();
  useDialogBehaviour(open, onClose, ref);
  const from = side === 'right' ? '100%' : '-100%';
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]">
          <motion.div className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ x: from }}
            animate={{ x: 0 }}
            exit={{ x: from }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn('absolute top-0 flex h-full w-[86%] max-w-sm flex-col border-white/10 bg-ink-900', side === 'right' ? 'right-0 border-l' : 'left-0 border-r')}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h2 id={titleId} className="display text-2xl text-fog-100">
                {title}
              </h2>
              <button onClick={onClose} className="rounded-lg p-2 text-fog-400 hover:bg-white/5" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm leading-relaxed text-fog-300">{message}</p>}
      {children}
    </Modal>
  );
}
