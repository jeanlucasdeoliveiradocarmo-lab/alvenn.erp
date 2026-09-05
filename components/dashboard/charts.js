import { STATUS_CONFIG, STATUS_OPTIONS, formatCurrency } from "@/lib/crm";

export function ConversionGauge({ value }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="flex items-center justify-center py-3">
      <div className="relative h-40 w-40">
        <svg aria-label={`Taxa de conversão: ${safeValue.toFixed(1)}%`} className="h-full w-full -rotate-90" role="img" viewBox="0 0 140 140">
          <circle cx="70" cy="70" fill="none" r={radius} stroke="#e2e8f0" strokeWidth="14" />
          <circle
            cx="70"
            cy="70"
            fill="none"
            r={radius}
            stroke="#0b44e8"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth="14"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <strong className="text-3xl font-black text-[#071a57]">{safeValue.toFixed(1)}%</strong>
          <span className="text-xs font-bold text-slate-500">conversão</span>
        </div>
      </div>
    </div>
  );
}

export function StatusVolumeChart({ counts }) {
  const maxValue = Math.max(1, ...Object.values(counts));

  return (
    <div className="space-y-4 py-2">
      {STATUS_OPTIONS.map((status) => {
        const count = counts[status.value] || 0;
        const width = `${Math.max(count ? 8 : 0, (count / maxValue) * 100)}%`;

        return (
          <div key={status.value}>
            <div className="mb-1.5 flex justify-between gap-3 text-xs font-bold text-slate-600">
              <span>{status.label}</span>
              <span>{count}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                aria-label={`${status.label}: ${count}`}
                className="h-full rounded-full transition-[width] duration-500"
                role="meter"
                style={{ backgroundColor: STATUS_CONFIG[status.value].color, width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SalesProjectionChart({ closedRevenue, futurePipeline }) {
  const projected = closedRevenue + futurePipeline;
  const maxValue = Math.max(1, projected);
  const data = [
    { label: "Vendas fechadas", value: closedRevenue, color: "bg-emerald-500" },
    { label: "Pipeline futuro", value: futurePipeline, color: "bg-purple-500" },
    { label: "Projeção total", value: projected, color: "bg-blue-600" },
  ];

  return (
    <div className="space-y-5 py-2">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex justify-between gap-3 text-xs font-bold text-slate-600">
            <span>{item.label}</span>
            <span>{formatCurrency(item.value)}</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              aria-label={`${item.label}: ${formatCurrency(item.value)}`}
              className={`h-full rounded-full transition-[width] duration-500 ${item.color}`}
              role="meter"
              style={{ width: `${Math.max(item.value ? 8 : 0, (item.value / maxValue) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
