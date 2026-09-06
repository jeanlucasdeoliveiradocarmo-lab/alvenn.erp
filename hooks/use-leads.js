"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  getTimestampInMillis,
  parseCurrencyToCents,
} from "@/lib/crm";

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

  if (Number.isInteger(cents) && cents >= 0) {
    return cents;
  }

  return parseCurrencyToCents(data.valor ?? data.budget ?? 0);
}

export function normalizeLead(leadDocument) {
  const data = leadDocument.data() || {};

  const rawValue = Number(data.valor || data.budget || 0);

  return {
    ...data,
    id: leadDocument.id,

    nome: String(data.nome || data.name || "Sem nome").trim(),
    email: String(data.email || "").trim().toLowerCase(),
    telefone: String(data.telefone || data.phone || "").trim(),
    mensagem: String(data.mensagem || data.message || ""),
    origem: String(data.origem || "Landing Page"),

    status: normalizeStatus(data.status),
    valor: Number.isFinite(rawValue) ? rawValue : 0,
    valorOrcamentoCentavos: normalizeBudget(data),
    moeda: data.moeda || "BRL",

    tarefas: Array.isArray(data.tarefas)
      ? data.tarefas.filter(
          (task) => task && typeof task === "object",
        )
      : [],

    createdAt: data.createdAt || data.timestamp || null,
  };
}

export function useLeads(clientId) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(Boolean(clientId));
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [newLeadToast, setNewLeadToast] = useState(null);

  const initialSnapshotRef = useRef(true);

  useEffect(() => {
    if (!newLeadToast) return;

    const timeout = window.setTimeout(
      () => setNewLeadToast(null),
      5000,
    );

    return () => window.clearTimeout(timeout);
  }, [newLeadToast]);

  useEffect(() => {
    setLeads([]);
    setNewLeadToast(null);
    setError("");
    setFromCache(false);

    if (!clientId) {
      setLoading(false);
      return;
    }

    initialSnapshotRef.current = true;
    setLoading(true);

    const leadsQuery = query(
      collection(db, "leads"),
      where("clienteId", "==", clientId),
    );

    const unsubscribe = onSnapshot(
      leadsQuery,
      { includeMetadataChanges: true },

      (snapshot) => {
        const addedAfterInitialLoad =
          !initialSnapshotRef.current
            ? snapshot
                .docChanges()
                .filter((change) => change.type === "added")
            : [];

        // Ordenação local mantém documentos antigos sem createdAt.
        const nextLeads = snapshot.docs
          .map(normalizeLead)
          .sort(
            (a, b) =>
              getTimestampInMillis(b.createdAt) -
              getTimestampInMillis(a.createdAt),
          );

        setLeads(nextLeads);
        setFromCache(snapshot.metadata.fromCache);
        setLoading(false);
        setError("");

        if (addedAfterInitialLoad.length > 0) {
          const newest = normalizeLead(
            addedAfterInitialLoad[
              addedAfterInitialLoad.length - 1
            ].doc,
          );

          setNewLeadToast({
            id: `${newest.id}:${Date.now()}`,
            message: "Novo Lead recebido do site!",
            leadName: newest.nome,
          });
        }

        initialSnapshotRef.current = false;
      },

      (firestoreError) => {
        console.error(
          "[Alvenn ERP] Falha ao consultar leads",
          {
            code: firestoreError.code,
            message: firestoreError.message,
            projectId: db.app.options.projectId,
            collection: "leads",
            clienteId: clientId,
          },
          firestoreError,
        );

        setLeads([]);
        setLoading(false);

        setError(
          firestoreError.code === "permission-denied"
            ? "Sem permissão para ler leads. Confira as regras do Firestore e o clienteId dos documentos."
            : `Falha ao sincronizar leads (${firestoreError.code || "desconhecido"}). Confira a conexão e tente novamente.`,
        );
      },
    );

    return () => unsubscribe();
  }, [clientId, retryCount]);

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
