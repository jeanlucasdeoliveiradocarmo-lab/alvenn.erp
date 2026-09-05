"use client";

export function NotificationCenter({
  notifications,
  onDismiss,
  onClear,
}) {
  if (!notifications.length) return null;

  return (
    <section
      aria-label="Notificações de tarefas"
      aria-live="assertive"
      className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            Lembretes
          </p>
          <h2 className="mt-1 font-black text-amber-950">
            {notifications.length} {notifications.length === 1 ? "tarefa próxima" : "tarefas próximas"}
          </h2>
        </div>
        <button
          className="text-xs font-bold text-amber-800 underline underline-offset-4"
          onClick={onClear}
          type="button"
        >
          Limpar avisos
        </button>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {notifications.map((notification) => (
          <article
            className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3"
            key={notification.id}
          >
            <div>
              <p className="text-sm font-black text-amber-900">{notification.title}</p>
              <p className="mt-1 text-sm text-slate-700">{notification.message}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Agendada para {notification.scheduledLabel}
              </p>
            </div>
            <button
              aria-label="Dispensar notificação"
              className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-slate-100"
              onClick={() => onDismiss(notification.id)}
              type="button"
            >
              ×
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
