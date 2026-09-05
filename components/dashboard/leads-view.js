"use client";

import { LeadCard } from "./lead-card";

const FILTERS = [
  { value: "todos", label: "Todos", active: "border-[#0b44e8] bg-[#0b44e8] text-white", idle: "border-slate-200 bg-white text-slate-700" },
  { value: "novo", label: "Novos", active: "border-blue-600 bg-blue-600 text-white", idle: "border-blue-200 bg-blue-50 text-blue-800" },
  { value: "atendimento", label: "Em Atendimento", active: "border-amber-500 bg-amber-500 text-white", idle: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "orcamento", label: "Orçamentos", active: "border-purple-600 bg-purple-600 text-white", idle: "border-purple-200 bg-purple-50 text-purple-800" },
  { value: "fechado", label: "Fechados", active: "border-emerald-600 bg-emerald-600 text-white", idle: "border-emerald-200 bg-emerald-50 text-emerald-800" },
];

export function LeadsView({
  leads,
  filteredLeads,
  counts,
  loading,
  activeFilter,
  updatingLeadId,
  deletingLeadId,
  onFilterChange,
  onCreateLead,
  onEditLead,
  onStatusChange,
  onDeleteLead,
}) {
  return (
    <section aria-labelledby="leads-title">
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-[#071a57] via-[#0b44e8] to-[#5013d6] p-6 text-white shadow-xl shadow-blue-900/15 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Visão comercial</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl" id="leads-title">Seu funil, mais simples.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Cadastre, edite e acompanhe oportunidades sincronizadas em tempo real.
            </p>
          </div>
          <button className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-[#071a57] shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-200" onClick={onCreateLead} type="button">
            + Criar Lead Manualmente
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.value;
          return (
            <button
              aria-pressed={isActive}
              className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isActive ? filter.active : filter.idle}`}
              key={filter.value}
              onClick={() => onFilterChange(filter.value)}
              type="button"
            >
              <span className="block text-2xl font-black">{loading ? "—" : counts[filter.value]}</span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-wide sm:text-sm">{filter.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[#071a57]">Leads</h2>
          <p className="mt-1 text-sm text-slate-500">{leads.length} contatos sincronizados com o Firestore.</p>
        </div>
        <span className="text-sm font-semibold text-slate-500">{filteredLeads.length} {filteredLeads.length === 1 ? "lead" : "leads"}</span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-blue-100 bg-white px-6 py-16 text-center text-slate-500 shadow-sm">Carregando leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="font-bold text-slate-800">Nenhum lead neste filtro.</p>
          <p className="mt-1 text-sm text-slate-500">Crie um lead ou selecione outra etapa do funil.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLeads.map((lead) => (
            <LeadCard
              deleting={deletingLeadId === lead.id}
              key={lead.id}
              lead={lead}
              onDelete={onDeleteLead}
              onEdit={onEditLead}
              onStatusChange={onStatusChange}
              updating={updatingLeadId === lead.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
