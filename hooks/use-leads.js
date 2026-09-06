"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseCurrencyToCents } from "@/lib/crm";

const STATUS_ALIASES = {
  novo: "novo",
  novo_lead: "novo",
  "novo lead": "novo",
  atendimento: "atendimento",
  "em atendimento": "atendimento",
  orcamento: "orcamento",
  orçamento: "orcamento",
  "orçamento enviado": "orcamento",
  fechado: "fechado",
  "venda fechada": "fechado",
  perdido: "perdido",
};

function normalizeStatus(value) {
  const normalized = String(value || "novo")
    .trim()
    .toLocaleLowerCase("pt-BR");
  return STATUS_ALIASES[normalized] || "novo";
}

function normalizeBudget(data) {
  const cents = Number(data.valorOrcamentoCentavos);
  if (Number.isInteger(cents) && cents >= 0) return cents;
  return parseCurrencyToCents(data.valor ?? data.budget ?? 0);
}

function normalizeDate(value, fallback) {
  if (value && typeof value.toMillis === "function") {
    return Number.isFinite(value.toMillis()) ? value : fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return value;
  if (value && typeof value.seconds === "number") return value;
  return fallback;
}

function dateInMilliseconds(value) {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") return Date.parse(value) || 0;
  if (value && typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

export function normalizeLead(leadDocument, fallbackDate = Date.now()) {
  const data = leadDocument.data() || {};
  const date = normalizeDate(
    data.criadoEm ?? data.createdAt ?? data.timestamp,
    fallbackDate,
  );
  const rawValue = Number(data.valor ?? data.budget ?? 0);

  return {
    ...data,
    id: leadDocument.id,
    nome: String(data.nome || data.name || "Lead sem nome").trim(),
    email: String(data.email || "Sem e-mail").trim().toLowerCase(),
    telefone: String(data.telefone || data.phone || "Sem telefone").trim(),
    mensagem: String(data.mensagem || data.message || ""),
    origem: String(data.origem || "Não informada"),
    status: normalizeStatus(data.status || "novo"),
    valor: Number.isFinite(rawValue) ? rawValue : 0,
    valorOrcamentoCentavos: normalizeBudget(data),
    moeda: data.moeda || "BRL",
    tarefas: Array.isArray(data.tarefas)
      ? data.tarefas.filter((task) => task && typeof task === "object")
      : [],
    criadoEm: date,
    createdAt: date,
  };
}

export function useLeads(authenticatedUserId) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(Boolean(authenticatedUserId));
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [newLeadToast, setNewLeadToast] = useState(null);
  const initialSnapshotRef = useRef(true);
  const seenIdsRef = useRef(new Set());

  useEffect(() => {
    if (!newLeadToast) return undefined;
    const timeout = window.setTimeout(() => setNewLeadToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [newLeadToast]);

  useEffect(() => {
    setLeads([]);
    setError("");
    setFromCache(false);
    setNewLeadToast(null);
    seenIdsRef.current = new Set();
    initialSnapshotRef.current = true;

    if (!authenticatedUserId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let active = true;

    const unsubscribe = onSnapshot(
      collection(db, "leads"),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active) return;

        const fallbackDate = Date.now();
        const nextLeads = snapshot.docs
          .map((documentSnapshot) =>
            normalizeLead(documentSnapshot, fallbackDate),
          )
          .sort(
            (leadA, leadB) =>
              dateInMilliseconds(leadB.criadoEm) -
                dateInMilliseconds(leadA.criadoEm) ||
              leadA.id.localeCompare(leadB.id),
          );

        if (!initialSnapshotRef.current) {
          const newestLead = nextLeads.find(
            (lead) => !seenIdsRef.current.has(lead.id),
          );
          if (newestLead) {
            setNewLeadToast({
              id: `${newestLead.id}:${Date.now()}`,
              message: "Novo Lead recebido do site!",
              leadName: newestLead.nome,
            });
          }
        }

        seenIdsRef.current = new Set(nextLeads.map((lead) => lead.id));
        if (!snapshot.metadata.fromCache) initialSnapshotRef.current = false;
        setLeads(nextLeads);
        setFromCache(snapshot.metadata.fromCache);
        setLoading(false);
        setError("");
      },
      (firestoreError) => {
        if (!active) return;
        console.error("Erro ao escutar atualizações em tempo real:", firestoreError, {
          projectId: db.app.options.projectId,
          collection: "leads",
        });
        setLeads([]);
        setLoading(false);
        setError(
          firestoreError.code === "permission-denied"
            ? "Sem permissão para escutar toda a coleção leads. Ajuste as regras do Firestore ou use uma consulta compatível com a propriedade dos dados."
            : `Falha ao sincronizar leads (${firestoreError.code || "desconhecido"}). Confira a conexão e tente novamente.`,
        );
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authenticatedUserId, retryCount]);

  return {
    leads,
    loading,
    error,
    setError,
    fromCache,
    retry: () => setRetryCount((count) => count + 1),
    newLeadToast,
    dismissNewLeadToast: () => setNewLeadToast(null),
  };
}
