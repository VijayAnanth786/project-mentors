import React, { useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const tone = status.includes('DELAY') || status.includes('IMPROVEMENT') || status === 'inactive' ? 'bg-rose-50 text-rose-700 border-rose-100' : status.includes('ATTENTION') || status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone}`}>{status.replace(/_/g, ' ')}</span>;
};

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-label={`${value}% complete`}><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${value}%` }} /></div>;

export const SummaryCard: React.FC<{ label: string; value: string | number; detail?: string; icon: React.ElementType }> = ({ label, value, detail, icon: Icon }) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-900">{value}</p>{detail && <p className="mt-1 text-[11px] font-medium text-slate-400">{detail}</p>}</div><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Icon className="h-5 w-5" /></div></div></div>;

export const EmptyState: React.FC<{ title: string; description: string }> = ({ title, description }) => <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h3 className="font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-500">{description}</p></div>;

export const WelcomeBanner: React.FC<{ eyebrow: string; title: string; description: string }> = ({ eyebrow, title, description }) => <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-blue-600">{eyebrow}</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{title}</h1><p className="mt-2 text-sm font-medium text-slate-500">{description}</p></div>;

export const FormField: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => <label className="block text-xs font-bold text-slate-700"><span>{label}</span>{children}{error && <span className="mt-1 block font-medium text-rose-600">{error}</span>}</label>;

export const DataTable: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full divide-y divide-slate-100 text-left">{children}</table></div>;

export const Modal: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode }> = ({ open, title, onClose, children }) => {
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; closeButton.current?.focus(); const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); if (event.key === 'Tab' && dialog.current) { const focusable = dialog.current.querySelectorAll<HTMLElement>('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])'); const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } } }; document.addEventListener('keydown', onKeyDown); return () => document.removeEventListener('keydown', onKeyDown); }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="modal-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 id="modal-title" className="text-lg font-black text-slate-900">{title}</h2><button ref={closeButton} onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button></div><div className="mt-5">{children}</div></div></div>;
};

export const ConfirmDialog: React.FC<{ open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }> = ({ open, title, message, onConfirm, onCancel }) => <Modal open={open} title={title} onClose={onCancel}><p className="text-sm text-slate-600">{message}</p><div className="mt-6 flex justify-end gap-3"><button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button onClick={onConfirm} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">Confirm</button></div></Modal>;

export const Toast: React.FC<{ message?: string; onDismiss?: () => void }> = ({ message, onDismiss }) => message ? <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl" role="status"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{message}<button onClick={onDismiss} aria-label="Dismiss message"><X className="h-3.5 w-3.5" /></button></div> : null;