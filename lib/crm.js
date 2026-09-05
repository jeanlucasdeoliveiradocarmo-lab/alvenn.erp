export const STATUS_OPTIONS = [
  { value: "novo", label: "Novo Lead" },
  { value: "atendimento", label: "Em Atendimento" },
  { value: "orcamento", label: "Orçamento Enviado" },
  { value: "fechado", label: "Venda Fechada" },
  { value: "perdido", label: "Perdido" },
];

export const STATUS_CONFIG = {
  novo: {
    label: "Novo Lead",
    color: "#2563eb",
    badge: "border-blue-300 bg-blue-100 text-blue-800",
  },
  atendimento: {
    label: "Em Atendimento",
    color: "#f59e0b",
    badge: "border-amber-300 bg-amber-100 text-amber-800",
  },
  orcamento: {
    label: "Orçamento Enviado",
    color: "#9333ea",
    badge: "border-purple-300 bg-purple-100 text-purple-800",
  },
  fechado: {
    label: "Venda Fechada",
    color: "#059669",
    badge: "border-emerald-300 bg-emerald-100 text-emerald-800",
  },
  perdido: {
    label: "Perdido",
    color: "#e11d48",
    badge: "border-rose-300 bg-rose-100 text-rose-800",
  },
};

export const ORIGIN_OPTIONS = [
  "Landing Page",
  "WhatsApp",
  "Instagram",
  "Indicação",
  "Presencial/Balcão",
];

export const EMPTY_LEAD_FORM = {
  nome: "",
  telefone: "",
  email: "",
  origem: "Landing Page",
  mensagem: "",
  status: "novo",
  valorOrcamento: "",
  tarefas: [],
};

export const MAX_TIMEOUT_MS = 2_147_000_000;
export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export function getTimestampInMillis(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "string") return new Date(value).getTime() || 0;
  if (value?.seconds) return value.seconds * 1000;
  return 0;
}

export function formatDateTime(value) {
  const milliseconds = getTimestampInMillis(value);
  if (!milliseconds) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(milliseconds));
}

export function toDateTimeLocal(value) {
  const milliseconds = getTimestampInMillis(value);
  if (!milliseconds) return "";

  const date = new Date(milliseconds);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(milliseconds - offset).toISOString().slice(0, 16);
}

export function getMinimumDateTimeLocal() {
  const nextWholeMinute = Math.ceil(Date.now() / 60_000) * 60_000;
  return toDateTimeLocal(nextWholeMinute);
}

export function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

export function getWhatsAppNumber(value) {
  const phone = normalizePhone(value);
  return phone.startsWith("55") ? phone : `55${phone}`;
}

export function parseCurrencyToCents(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0;
}

export function centsToInputValue(cents) {
  if (!Number.isFinite(cents) || cents <= 0) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function formatCurrency(cents = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(cents) || 0) / 100);
}

export function getLeadMetrics(leads) {
  const statusCounts = Object.fromEntries(
    STATUS_OPTIONS.map(({ value }) => [value, 0]),
  );

  let closedRevenue = 0;
  let closedThisMonth = 0;
  let futurePipeline = 0;
  const now = new Date();

  for (const lead of leads) {
    const status = STATUS_CONFIG[lead.status] ? lead.status : "novo";
    const amount = Number(lead.valorOrcamentoCentavos) || 0;
    statusCounts[status] += 1;

    if (status === "fechado") {
      closedRevenue += amount;
      const closedAt = new Date(
        getTimestampInMillis(lead.closedAt || lead.updatedAt || lead.createdAt),
      );
      if (
        closedAt.getFullYear() === now.getFullYear() &&
        closedAt.getMonth() === now.getMonth()
      ) {
        closedThisMonth += amount;
      }
    } else if (status === "orcamento" || status === "atendimento") {
      futurePipeline += amount;
    }
  }

  const totalLeads = leads.length;
  const closedLeads = statusCounts.fechado;

  return {
    totalLeads,
    closedLeads,
    conversionRate: totalLeads ? (closedLeads / totalLeads) * 100 : 0,
    statusCounts,
    closedRevenue,
    closedThisMonth,
    futurePipeline,
    projectedSales: closedRevenue + futurePipeline,
  };
}

export function leadToForm(lead) {
  if (!lead) return { ...EMPTY_LEAD_FORM, tarefas: [] };

  return {
    nome: lead.nome || "",
    telefone: lead.telefone || "",
    email: lead.email || "",
    origem: lead.origem || "Landing Page",
    mensagem: lead.mensagem || "",
    status: lead.status || "novo",
    valorOrcamento: centsToInputValue(lead.valorOrcamentoCentavos),
    tarefas: (lead.tarefas || []).map((task) => ({
      id: task.id || crypto.randomUUID(),
      descricao: task.descricao || "",
      agendadaPara: toDateTimeLocal(task.agendadaPara),
      concluida: Boolean(task.concluida),
      _persisted: true,
    })),
  };
}
