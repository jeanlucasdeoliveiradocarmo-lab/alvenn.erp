"use client";

export function NewLeadToast({ toast, onDismiss }) {
  if (!toast) return null;

  return (
    <aside
      aria-atomic="true"
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-[70] w-[calc(100%-2.5rem)] max-w-sm rounded-2xl border border-emerald-300 bg-white p-4 shadow-2xl shadow-emerald-950/20"
      role="status"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">
            ✓
          </span>
          <div>
            <p className="font-black text-emerald-900">{toast.message}</p>
            <p className="mt-1 text-sm text-slate-600">{toast.leadName}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              A lista já foi atualizada em tempo real.
            </p>
          </div>
        </div>
        <button
          aria-label="Fechar notificação de novo lead"
          className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-slate-100"
          onClick={onDismiss}
          type="button"
        >
          ×
        </button>
      </div>
    </aside>
  );
}
