import { MetricCard } from "./metric-card";
import { STATUS_CONFIG, formatCurrency, formatDateTime } from "@/lib/crm";

export function FinancialView({ leads, metrics, onEditLead }) {
  const financialLeads = leads
    .filter((lead) => Number(lead.valorOrcamentoCentavos) > 0)
    .sort(
      (leadA, leadB) =>
        (Number(leadB.valorOrcamentoCentavos) || 0) -
        (Number(leadA.valorOrcamentoCentavos) || 0),
    );

  return (
    <section aria-labelledby="financial-title">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Financeiro</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-[#071a57]" id="financial-title">
          Controle Financeiro
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Consolidação automática dos valores de orçamento e vendas ganhas.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Faturamento total" value={formatCurrency(metrics.closedRevenue)} detail="Todas as vendas fechadas" tone="emerald" />
        <MetricCard label="Fechadas no mês" value={formatCurrency(metrics.closedThisMonth)} detail="Com base na última atualização" tone="cyan" />
        <MetricCard label="Pipeline futuro" value={formatCurrency(metrics.futurePipeline)} detail="Atendimento + orçamentos" tone="violet" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-black text-[#071a57]">Valores por oportunidade</h3>
          <p className="mt-1 text-sm text-slate-500">
            Clique em um registro para editar o lead ou atualizar o valor.
          </p>
        </div>

        {financialLeads.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            Nenhum valor de orçamento foi cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['Lead', 'Status', 'Valor', 'Atualização', 'Ação'].map((heading) => (
                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500" key={heading} scope="col">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financialLeads.map((lead) => {
                  const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
                  return (
                    <tr className="hover:bg-blue-50/50" key={lead.id}>
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-800">{lead.nome}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${status.badge}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-black text-slate-900">
                        {formatCurrency(lead.valorOrcamentoCentavos)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDateTime(lead.updatedAt || lead.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <button className="text-sm font-bold text-blue-700 hover:underline" onClick={() => onEditLead(lead)} type="button">
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
