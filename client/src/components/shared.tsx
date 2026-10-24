import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, X, LucideIcon } from 'lucide-react';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = (status || '').toUpperCase();
  let tone = 'bg-slate-100 text-slate-700 border-slate-200';

  if (s.includes('DELAY') || s.includes('CHANGES') || s === 'INACTIVE' || s.includes('ISSUE')) {
    tone = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (s.includes('ATTENTION') || s === 'PENDING' || s.includes('WAITING') || s.includes('OVERDUE')) {
    tone = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (s.includes('TRACK') || s === 'APPROVED' || s === 'ACTIVE' || s.includes('COMPLETE')) {
    tone = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  const label = status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tone}`}>
      {label}
    </span>
  );
};

export const ProgressBar: React.FC<{ value: number; size?: 'sm' | 'md' }> = ({ value, size = 'md' }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div
      className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClass}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clamped}% complete`}
    >
      <div
        className="bg-blue-600 h-full rounded-full transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};

export const SummaryCard: React.FC<{
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon | React.ElementType;
}> = ({ label, value, detail, icon: Icon }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        {detail && <p className="mt-1 text-xs font-medium text-slate-400">{detail}</p>}
      </div>
      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

export const WelcomeBanner: React.FC<{
  title: string;
  description: string;
  eyebrow?: string;
  action?: React.ReactNode;
}> = ({ title, description, eyebrow, action }) => (
  <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white rounded-3xl p-6 sm:p-7 border border-blue-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="space-y-1">
      {eyebrow && (
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block">
          {eyebrow}
        </span>
      )}
      <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
        {title}
      </h1>
      <p className="text-sm font-medium text-slate-500 max-w-2xl">{description}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: LucideIcon | React.ElementType;
  action?: React.ReactNode;
}> = ({ title, description, icon: Icon, action }) => (
  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center">
    {Icon && (
      <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <Icon className="w-6 h-6" />
      </div>
    )}
    <h3 className="text-base font-bold text-slate-800">{title}</h3>
    <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading live data...' }) => (
  <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-semibold text-slate-500">{message}</p>
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-6 text-center space-y-3 my-4">
    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
    <h3 className="text-sm font-bold text-rose-900">Failed to load content</h3>
    <p className="text-xs text-rose-600 max-w-md mx-auto">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Retry</span>
      </button>
    )}
  </div>
);

export const FormField: React.FC<{
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, error, required, children }) => (
  <label className="block text-xs font-bold text-slate-700 space-y-1.5">
    <span>
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    {children}
    {error && <span className="block font-medium text-rose-600 text-[11px]">{error}</span>}
  </label>
);

export const DataTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
    <table className="min-w-full divide-y divide-slate-100 text-left">{children}</table>
  </div>
);

export const Modal: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}> = ({ open, title, onClose, maxWidth = 'max-w-lg', children }) => {
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }

    // Only set initial focus once when modal opens
    if (!prevOpenRef.current) {
      prevOpenRef.current = true;
      const timer = setTimeout(() => {
        if (!dialog.current?.contains(document.activeElement)) {
          const firstInput = dialog.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
          if (firstInput) {
            firstInput.focus();
          } else {
            closeButton.current?.focus();
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key === 'Tab' && dialog.current) {
        const focusable = dialog.current.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`w-full ${maxWidth} rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 transition-all my-8`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 id="modal-title" className="text-lg font-black text-slate-900 tracking-tight">
            {title}
          </h2>
          <button
            ref={closeButton}
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onCancel
}) => (
  <Modal open={open} title={title} onClose={onCancel}>
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{message}</p>
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors cursor-pointer ${
            tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </Modal>
);

export const Toast: React.FC<{
  message?: string;
  type?: 'success' | 'error';
  onDismiss?: () => void;
}> = ({ message, type = 'success', onDismiss }) => {
  if (!message) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-slate-800 animate-slide-up"
      role="status"
    >
      {type === 'error' ? (
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      )}
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};