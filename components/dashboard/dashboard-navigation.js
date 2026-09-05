"use client";

const TABS = [
  { value: "leads", label: "Leads" },
  { value: "analises", label: "Análise de Dados" },
  { value: "financeiro", label: "Controle Financeiro" },
];

export function DashboardNavigation({ activeTab, onChange }) {
  return (
    <nav aria-label="Módulos do CRM" className="mb-6 overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm sm:min-w-0">
        {TABS.map((tab) => (
          <button
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={`min-w-max flex-1 rounded-xl px-4 py-3 text-sm font-bold transition sm:min-w-44 ${
              activeTab === tab.value
                ? "bg-[#0b44e8] text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-blue-50 hover:text-blue-800"
            }`}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
