"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
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

  const rawValue = data.valor ?? data.budget ?? 0;

  return parseCurrencyToCents(rawValue);
}

export function normalizeLead(leadDocument) {
  const data = leadDocument.data() || {};
  const rawValue = Number(data.valor || data.budget || 0);
  const value = Number.isFinite(rawValue) ? rawValue : 0;

  return {
    ...data,
    id: leadDocument.id,

    nome: String(
      data.nome || data.name || "Sem nome",
    ).trim(),

    email: String(data.email || "")
      .trim()
      .toLowerCase(),

    telefone: String(
      data.telefone || data.phone || "",
    ).trim(),

    mensagem: String(
      data.mensagem || data.message || "",
    ),

    origem: String(
      data.origem || "Landing Page",
    ),

    status: normalizeStatus(
      data.status || "Novo",
    ),

    valor: value,

    valorOrcamentoCentavos:
      normalizeBudget(data),

    moeda: data.moeda || "BRL",

    tarefas: Array.isArray(data.tarefas)
      ? data.tarefas.filter(
          (task) =>
            task &&
            typeof task === "object",
        )
      : [],

    // Compatibilidade com registros antigos.
    criadoEm:
      data.criadoEm ||
      data.createdAt ||
      data.timestamp ||
      null,

    createdAt:
      data.criadoEm ||
      data.createdAt ||
      data.timestamp ||
      null,
  };
}

export function useLeads(clientId) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(
    Boolean(clientId),
  );
  const [error, setError] = useState("");
  const [newLeadToast, setNewLeadToast] =
    useState(null);
  const [fromCache, setFromCache] =
    useState(false);
  const [retryCount, setRetryCount] =
    useState(0);

  const initialSnapshotRef = useRef(true);

  useEffect(() => {
    if (!newLeadToast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setNewLeadToast(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [newLeadToast]);

  useEffect(() => {
    setLeads([]);
    setNewLeadToast(null);
    setError("");
    setFromCache(false);

    if (!clientId) {
      setLoading(false);
      return undefined;
    }

    initialSnapshotRef.current = true;
    setLoading(true);

    /*
     * O filtro clienteId é necessário porque as regras
     * do Firestore permitem que cada usuário consulte
     * somente seus próprios leads.
     */
    const baseQuery = query(
      collection(db, "leads"),
      where("clienteId", "==", clientId),
    );

    /*
     * O ouvinte principal usa a ordenação solicitada:
     * lead mais recente primeiro.
     */
    const orderedQuery = query(
      baseQuery,
      orderBy("criadoEm", "desc"),
    );

    let active = true;
    let failed = false;
    let orderedSnapshot = null;
    let compatibilitySnapshot = null;
    let seenIds = new Set();

    function publish() {
      if (
        !active ||
        failed ||
        !orderedSnapshot ||
        !compatibilitySnapshot
      ) {
        return;
      }

      const documents = new Map();

      /*
       * O Firestore não devolve documentos que não tenham
       * o campo utilizado no orderBy. Por isso, o snapshot
       * de compatibilidade inclui registros antigos sem
       * criadoEm.
       */
      for (const documentSnapshot of
        compatibilitySnapshot.docs) {
        const data =
          documentSnapshot.data() || {};

        if (data.criadoEm == null) {
          documents.set(
            documentSnapshot.id,
            normalizeLead(documentSnapshot),
          );
        }
      }

      for (const documentSnapshot of
        orderedSnapshot.docs) {
        documents.set(
          documentSnapshot.id,
          normalizeLead(documentSnapshot),
        );
      }

      const nextLeads = [
        ...documents.values(),
      ].sort((leadA, leadB) => {
        const dateDifference =
          getTimestampInMillis(
            leadB.criadoEm,
          ) -
          getTimestampInMillis(
            leadA.criadoEm,
          );

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return leadA.id.localeCompare(
          leadB.id,
        );
      });

      const cached =
        orderedSnapshot.metadata.fromCache ||
        compatibilitySnapshot.metadata
          .fromCache;

      if (!initialSnapshotRef.current) {
        const newestLead = nextLeads.find(
          (lead) => !seenIds.has(lead.id),
        );

        if (newestLead) {
          setNewLeadToast({
            id: `${newestLead.id}:${Date.now()}`,
            message:
              "Novo Lead recebido do site!",
            leadName: newestLead.nome,
          });
        }
      }

      seenIds = new Set(
        nextLeads.map((lead) => lead.id),
      );

      if (!cached) {
        initialSnapshotRef.current = false;
      }

      setLeads(nextLeads);
      setFromCache(cached);
      setLoading(false);
      setError("");
    }

    function handleError(firestoreError) {
      if (!active) {
        return;
      }

      failed = true;

      console.error(
        "Erro ao escutar atualizações em tempo real:",
        firestoreError,
        {
          projectId:
            db.app.options.projectId,
          collection: "leads",
          clienteId: clientId,
        },
      );

      setLeads([]);
      setLoading(false);

      if (
        firestoreError.code ===
        "permission-denied"
      ) {
        setError(
          "Sem permissão para ler leads. Confira as regras e o clienteId dos documentos.",
        );
        return;
      }

      if (
        firestoreError.code ===
        "failed-precondition"
      ) {
        setError(
          "A consulta exige o índice clienteId + criadoEm. Publique firestore.indexes.json e aguarde sua criação.",
        );
        return;
      }

      setError(
        `Falha ao sincronizar leads (${
          firestoreError.code ||
          "desconhecido"
        }). Confira a conexão e tente novamente.`,
      );
    }

    const unsubscribe = onSnapshot(
      orderedQuery,
      {
        includeMetadataChanges: true,
      },
      (snapshot) => {
        orderedSnapshot = snapshot;
        publish();
      },
      handleError,
    );

    /*
     * Consulta adicional para registros antigos sem criadoEm.
     * Ela pode ser removida depois que todos os documentos
     * antigos forem migrados.
     */
    const unsubscribeLegacy = onSnapshot(
      baseQuery,
      {
        includeMetadataChanges: true,
      },
      (snapshot) => {
        compatibilitySnapshot = snapshot;
        publish();
      },
      handleError,
    );

    /*
     * Cleanup obrigatório dos dois listeners.
     */
    return () => {
      active = false;
      unsubscribe();
      unsubscribeLegacy();
    };
  }, [clientId, retryCount]);

  return {
    leads,
    loading,
    error,
    setError,
    fromCache,

    retry: () => {
      setRetryCount(
        (currentCount) =>
          currentCount + 1,
      );
    },

    newLeadToast,

    dismissNewLeadToast: () => {
      setNewLeadToast(null);
    },
  };
}
