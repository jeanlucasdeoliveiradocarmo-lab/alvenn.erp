"use client";

export function DashboardHeader({ userEmail, onLogout }) {
  return (
    <header className="border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-violet-700 text-lg font-black tracking-tight text-white shadow-lg shadow-blue-600/25">
            AL
          </div>
          <div>
            <p className="text-lg font-black tracking-tight text-[#071a57]">Alvenn ERP</p>
            <h1 className="text-sm font-medium text-slate-500">Gestão comercial</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-slate-500 md:block">
            {userEmail || "Usuário conectado"}
          </p>
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
            onClick={onLogout}
            type="button"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
