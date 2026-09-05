import { ConversionGauge, SalesProjectionChart, StatusVolumeChart } from "./charts";
import { MetricCard } from "./metric-card";
import { formatCurrency } from "@/lib/crm";

function ChartCard({ title, description, children }) {
  return (
    <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-[#071a57]">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export function AnalyticsView({ metrics }) {
  return (
    <section aria-labelledby="analytics-title">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Performance</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-[#071a57]" id="analytics-title">
          Análise de Dados
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Indicadores calculados em tempo real a partir dos leads sincronizados.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total de leads" value={metrics.totalLeads} detail="Base comercial atual" tone="blue" />
        <MetricCard label="Conversão" value={`${metrics.conversionRate.toFixed(1)}%`} detail={`${metrics.closedLeads} vendas fechadas`} tone="cyan" />
        <MetricCard label="Vendas realizadas" value={formatCurrency(metrics.closedRevenue)} detail="Receita ganha acumulada" tone="emerald" />
        <MetricCard label="Projeção" value={formatCurrency(metrics.projectedSales)} detail="Fechado + pipeline futuro" tone="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Taxa de conversão" description="Leads fechados em relação ao total captado.">
          <ConversionGauge value={metrics.conversionRate} />
        </ChartCard>
        <ChartCard title="Volume por status" description="Distribuição atual das oportunidades no funil.">
          <StatusVolumeChart counts={metrics.statusCounts} />
        </ChartCard>
        <ChartCard title="Projeção vs. realizado" description="Comparativo dos valores registrados nos leads.">
          <SalesProjectionChart closedRevenue={metrics.closedRevenue} futurePipeline={metrics.futurePipeline} />
        </ChartCard>
      </div>
    </section>
  );
}
