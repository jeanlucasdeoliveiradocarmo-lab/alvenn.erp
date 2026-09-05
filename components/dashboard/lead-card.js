"use client";

import {
  STATUS_CONFIG,
  STATUS_OPTIONS,
  formatCurrency,
  formatDateTime,
  getWhatsAppNumber,
  normalizePhone,
} from "@/lib/crm";

export function LeadCard({
  lead,
  updating,
  deleting,
  onEdit,
  onStatusChange,
  onDelete,
}) {
  const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
  const phone = normalizePhone(lead.telefone);
  const openTasks = (lead.tarefas || []).filter((task) => !task.concluida);

  return (
    <article className="flex min-h-96 flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-900/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${status.badge}`}>
            {status.label}
          </span>
          <h3 className="mt-3 truncate text-xl font-black tracking-tight text-[#071a57]">
            {lead.nome || "Lead sem nome"}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            aria-label={`Editar lead ${lead.nome || "sem nome"}`}
            className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
            onClick={() => onEdit(lead)}
            type="button"
          >
            Editar
          </button>
          <button
            aria-label={`Excluir lead ${lead.nome || "sem nome"}`}
            className="rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50"
            disabled={deleting}
            onClick={() => onDelete(lead)}
            type="button"
          >
            {deleting ? "..." : "Excluir"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <a className="block truncate font-medium hover:text-blue-700" href={lead.email ? `mailto:${lead.email}` : undefined}>
          {lead.email || "E-mail não informado"}
        </a>
        <a className="block font-medium hover:text-blue-700" href={phone ? `tel:${phone}` : undefined}>
          {lead.telefone || "Telefone não informado"}
        </a>
        <p><span className="font-bold text-slate-700">Origem:</span> {lead.origem || "Não informada"}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-violet-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-violet-600">Orçamento</p>
          <p className="mt-1 text-sm font-black text-violet-950">{formatCurrency(lead.valorOrcamentoCentavos)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">Tarefas abertas</p>
          <p className="mt-1 text-sm font-black text-amber-950">{openTasks.length}</p>
        </div>
      </div>

      <div className="mt-4 flex-1 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Observação / Mensagem</p>
        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {lead.mensagem || "Nenhuma observação cadastrada."}
        </p>
        {openTasks[0] ? (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="text-xs font-black text-amber-700">Próxima tarefa</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{openTasks[0].descricao}</p>
            <p className="mt-1 text-xs text-slate-500">{formatDateTime(openTasks[0].agendadaPara)}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor={`status-${lead.id}`}>
          Alterar etapa
        </label>
        <select
          className={`w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 ${status.badge}`}
          disabled={updating}
          id={`status-${lead.id}`}
          onChange={(event) => onStatusChange(lead, event.target.value)}
          value={lead.status}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          className={`rounded-xl bg-emerald-600 px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-emerald-700 ${phone ? "" : "pointer-events-none opacity-50"}`}
          href={phone ? `https://wa.me/${getWhatsAppNumber(phone)}` : undefined}
          rel="noreferrer"
          target="_blank"
        >
          WhatsApp
        </a>
        <a
          className={`rounded-xl bg-[#0b44e8] px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#0836ba] ${phone ? "" : "pointer-events-none opacity-50"}`}
          href={phone ? `tel:${phone}` : undefined}
        >
          Ligar
        </a>
      </div>

      <p className="mt-3 text-right text-xs text-slate-400">Recebido em {formatDateTime(lead.createdAt)}</p>
    </article>
  );
}
