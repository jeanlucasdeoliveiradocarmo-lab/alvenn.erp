"use client";

import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";
import { FinancialView } from "@/components/dashboard/financial-view";
import { LeadModal } from "@/components/dashboard/lead-modal";
import { LeadsView } from "@/components/dashboard/leads-view";
import { NewLeadToast } from "@/components/dashboard/new-lead-toast";
import { NotificationCenter } from "@/components/dashboard/notification-center";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useLeads } from "@/hooks/use-leads";
import { useTaskNotifications } from "@/hooks/use-task-notifications";

import { auth, db } from "@/lib/firebase";

import {
  getLeadMetrics,
  parseCurrencyToCents,
} from "@/lib/crm";

export default function DashboardPage() {
  const router = useRouter();

  const {
    user,
    authLoading,
  } = useAuthUser();

  const {
    leads,
    loading,
    error,
    setError,
    newLeadToast,
    dismissNewLeadToast,
    fromCache,
    retry,
  } = useLeads(user?.uid);

  const {
    notifications,
    dismissNotification,
    clearNotifications,
  } = useTaskNotifications(leads);

  const [activeTab, setActiveTab] =
    useState("leads");

  const [activeFilter, setActiveFilter] =
    useState("todos");

  const [editingLead, setEditingLead] =
    useState(null);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    updatingLeadId,
    setUpdatingLeadId,
  ] = useState("");

  const [
    deletingLeadId,
    setDeletingLeadId,
  ] = useState("");

  const [
    copyFeedback,
    setCopyFeedback,
  ] = useState("");

  const metrics = useMemo(
    () => getLeadMetrics(leads),
    [leads],
  );

  const counts = useMemo(
    () => ({
      todos: leads.length,
      ...metrics.statusCounts,
    }),
    [
      leads.length,
      metrics.statusCounts,
    ],
  );

  const filteredLeads = useMemo(
    () =>
      activeFilter === "todos"
        ? leads
        : leads.filter(
            (lead) =>
              lead.status === activeFilter,
          ),
    [
      activeFilter,
      leads,
    ],
  );

  function openCreateModal() {
    setEditingLead(null);
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(lead) {
    setEditingLead(lead);
    setFormError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingLead(null);
    setFormError("");
  }

  async function handleSaveLead(form) {
    if (!user) {
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const now = Date.now();

      const invalidNewTask =
        form.tarefas.find(
          (task) =>
            !task._persisted &&
            new Date(
              task.agendadaPara,
            ).getTime() < now,
        );

      if (invalidNewTask) {
        setFormError(
          "Não é permitido salvar tarefas em datas ou horários passados.",
        );
        return;
      }

      const tasks = form.tarefas.map(
        (task) => ({
          id: task.id,

          descricao:
            task.descricao.trim(),

          agendadaPara:
            Timestamp.fromDate(
              new Date(
                task.agendadaPara,
              ),
            ),

          concluida: Boolean(
            task.concluida,
          ),
        }),
      );

      const data = {
        clienteId: user.uid,

        nome:
          form.nome.trim(),

        telefone:
          form.telefone.trim(),

        email:
          form.email
            .trim()
            .toLowerCase(),

        origem:
          form.origem,

        mensagem:
          form.mensagem.trim(),

        status:
          form.status,

        valorOrcamentoCentavos:
          parseCurrencyToCents(
            form.valorOrcamento,
          ),

        moeda: "BRL",
        tarefas: tasks,

        updatedAt:
          serverTimestamp(),
      };

      if (
        form.status === "fechado" &&
        editingLead?.status !== "fechado"
      ) {
        data.closedAt =
          serverTimestamp();
      }

      if (editingLead) {
        await updateDoc(
          doc(
            db,
            "leads",
            editingLead.id,
          ),
          data,
        );
      } else {
        await addDoc(
          collection(db, "leads"),
          {
            ...data,

            /*
             * Campo usado no orderBy
             * do ouvinte em tempo real.
             */
            criadoEm:
              serverTimestamp(),

            /*
             * Mantido para compatibilidade
             * com versões anteriores.
             */
            createdAt:
              serverTimestamp(),
          },
        );
      }

      setIsModalOpen(false);
      setEditingLead(null);
    } catch (firestoreError) {
      console.error(
        "Erro ao salvar lead:",
        firestoreError,
      );

      setFormError(
        "Não foi possível salvar o lead. Tente novamente.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(
    lead,
    status,
  ) {
    setUpdatingLeadId(lead.id);
    setError("");

    try {
      const changes = {
        status,

        valorOrcamentoCentavos:
          Number(
            lead.valorOrcamentoCentavos,
          ) || 0,

        moeda:
          lead.moeda || "BRL",

        tarefas:
          lead.tarefas || [],

        updatedAt:
          serverTimestamp(),
      };

      if (
        status === "fechado" &&
        lead.status !== "fechado"
      ) {
        changes.closedAt =
          serverTimestamp();
      }

      await updateDoc(
        doc(
          db,
          "leads",
          lead.id,
        ),
        changes,
      );
    } catch (firestoreError) {
      console.error(
        "Erro ao atualizar status:",
        firestoreError,
      );

      setError(
        "Não foi possível atualizar o status do lead.",
      );
    } finally {
      setUpdatingLeadId("");
    }
  }

  async function handleDeleteLead(lead) {
    const confirmed = window.confirm(
      `Excluir o lead ${
        lead.nome || "selecionado"
      }? Esta ação não pode ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingLeadId(lead.id);
    setError("");

    try {
      await deleteDoc(
        doc(
          db,
          "leads",
          lead.id,
        ),
      );
    } catch (firestoreError) {
      console.error(
        "Erro ao excluir lead:",
        firestoreError,
      );

      setError(
        "Não foi possível excluir o lead.",
      );
    } finally {
      setDeletingLeadId("");
    }
  }

  async function handleCopyClientId() {
    if (!user?.uid) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        user.uid,
      );

      setCopyFeedback("ID copiado!");

      window.setTimeout(() => {
        setCopyFeedback("");
      }, 2000);
    } catch (clipboardError) {
      console.error(
        "Erro ao copiar ID:",
        clipboardError,
      );

      setCopyFeedback(
        "Não foi possível copiar",
      );
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (logoutError) {
      console.error(
        "Erro ao sair:",
        logoutError,
      );

      setError(
        "Não foi possível encerrar a sessão.",
      );
    }
  }

  if (authLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f7ff] text-slate-500">
        Carregando Alvenn ERP...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7ff] text-slate-950">
      <DashboardHeader
        onLogout={handleLogout}
        userEmail={user.email}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <DashboardNavigation
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <NotificationCenter
          notifications={notifications}
          onClear={clearNotifications}
          onDismiss={
            dismissNotification
          }
        />

        <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                ID do Cliente
              </p>

              <p className="mt-2 truncate font-mono text-sm font-semibold text-slate-700">
                {user.uid}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Use este código para
                vincular integrações e
                novos leads à sua conta.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {copyFeedback ? (
                <span
                  className="text-xs font-semibold text-emerald-700"
                  role="status"
                >
                  {copyFeedback}
                </span>
              ) : null}

              <button
                className="rounded-xl bg-[#0b44e8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0836ba] disabled:opacity-50"
                disabled={!user.uid}
                onClick={
                  handleCopyClientId
                }
                type="button"
              >
                Copiar ID de Integração
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <p
            className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {error ? (
          <button
            type="button"
            onClick={retry}
            className="mb-6 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        ) : null}

        {!error &&
        !loading &&
        fromCache ? (
          <p
            role="status"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            Aguardando confirmação do
            servidor. Os dados disponíveis
            podem estar em cache; confira
            sua conexão se isso persistir.
          </p>
        ) : null}

        {!error &&
        !loading &&
        !fromCache &&
        leads.length === 0 ? (
          <p
            role="status"
            className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            Nenhum lead vinculado à sua
            conta. Confira se o clienteId
            dos documentos corresponde ao
            ID do Cliente acima e se o
            projeto Firebase está correto.
          </p>
        ) : null}

        {activeTab === "leads" ? (
          <LeadsView
            activeFilter={
              activeFilter
            }
            counts={counts}
            deletingLeadId={
              deletingLeadId
            }
            filteredLeads={
              filteredLeads
            }
            leads={leads}
            loading={loading}
            syncError={error}
            fromCache={fromCache}
            onCreateLead={
              openCreateModal
            }
            onDeleteLead={
              handleDeleteLead
            }
            onEditLead={
              openEditModal
            }
            onFilterChange={
              setActiveFilter
            }
            onStatusChange={
              handleStatusChange
            }
            updatingLeadId={
              updatingLeadId
            }
          />
        ) : null}

        {activeTab === "analises" ? (
          <AnalyticsView
            metrics={metrics}
          />
        ) : null}

        {activeTab ===
        "financeiro" ? (
          <FinancialView
            leads={leads}
            metrics={metrics}
            onEditLead={
              openEditModal
            }
          />
        ) : null}
      </div>

      {isModalOpen ? (
        <LeadModal
          error={formError}
          key={
            editingLead?.id ||
            "new-lead"
          }
          lead={editingLead}
          onClose={closeModal}
          onSave={handleSaveLead}
          saving={isSaving}
        />
      ) : null}

      <NewLeadToast
        onDismiss={
          dismissNewLeadToast
        }
        toast={newLeadToast}
      />
    </main>
  );
}
