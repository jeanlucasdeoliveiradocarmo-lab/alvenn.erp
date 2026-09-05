"use client";

import { useEffect, useState } from "react";
import {
  ORIGIN_OPTIONS,
  STATUS_OPTIONS,
  getMinimumDateTimeLocal,
  leadToForm,
} from "@/lib/crm";

import { ScheduledTasks } from "@/components/dashboard/scheduled-tasks";

const EMPTY_TASK = { descricao: "", agendadaPara: "" };

export function LeadModal({ lead, saving, error, onClose, onSave }) {
  const isEditing = Boolean(lead);
  const [form, setForm] = useState(() => leadToForm(lead));
  const [taskDraft, setTaskDraft] = useState(EMPTY_TASK);
  const [validationError, setValidationError] = useState("");
  const minimumDateTime = getMinimumDateTimeLocal();

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateTask(taskId, field, value) {
    setForm((current) => ({
      ...current,
      tarefas: current.tarefas.map((task) =>
        task.id === taskId
          ? {
              ...task,
              [field]: value,
              _persisted: field === "agendadaPara" ? false : task._persisted,
            }
          : task,
      ),
    }));
  }

  function addTask() {
    setValidationError("");
    const scheduledAt = new Date(taskDraft.agendadaPara).getTime();

    if (!taskDraft.descricao.trim()) {
      setValidationError("Digite a descrição da tarefa.");
      return;
    }

    if (!scheduledAt || scheduledAt < Date.now()) {
      setValidationError("A tarefa deve ser agendada para o momento atual ou uma data futura.");
      return;
    }

    setForm((current) => ({
      ...current,
      tarefas: [
        ...current.tarefas,
        {
          id: crypto.randomUUID(),
          descricao: taskDraft.descricao.trim(),
          agendadaPara: taskDraft.agendadaPara,
          concluida: false,
          _persisted: false,
        },
      ],
    }));
    setTaskDraft(EMPTY_TASK);
  }

  function removeTask(taskId) {
    setForm((current) => ({
      ...current,
      tarefas: current.tarefas.filter((task) => task.id !== taskId),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setValidationError("");

    const invalidTask = form.tarefas.find((task) => {
      if (!task.descricao.trim() || !task.agendadaPara) return true;
      return !task._persisted && new Date(task.agendadaPara).getTime() < Date.now();
    });

    if (invalidTask) {
      setValidationError(
        "Revise as tarefas: a descrição é obrigatória e novos agendamentos não podem estar no passado.",
      );
      return;
    }

    onSave(form);
  }

  return (
    <div
      aria-labelledby="lead-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a57]/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Alvenn ERP</p>
            <h2 className="mt-1 text-xl font-black text-[#071a57]" id="lead-modal-title">
              {isEditing ? "Editar Lead" : "Criar Lead Manualmente"}
            </h2>
          </div>
          <button aria-label="Fechar formulário" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <form className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="lead-name">Nome</label>
            <input autoFocus className="w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" id="lead-name" maxLength={120} onChange={(event) => updateForm("nome", event.target.value)} required type="text" value={form.nome} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="lead-phone">Telefone</label>
            <input autoComplete="tel" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" id="lead-phone" maxLength={30} onChange={(event) => updateForm("telefone", event.target.value)} placeholder="(11) 99999-9999" required type="tel" value={form.telefone} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="lead-email">E-mail</label>
            <input autoComplete="email" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" id="lead-email" maxLength={254} onChange={(event) => updateForm("email", event.target.value)} required type="email" value={form.email} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="lead-origin">Origem do Lead</label>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" id="lead-origin" onChange={(event) => updateForm("origem", event.target.value)} value={form.origem}>
              {ORIGIN_OPTIONS.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="lead-status">Status</label>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" id="lead-status" onChange={(event) => updateForm("status", event.target.value)} value={form.status}>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="lead-budget">Valor do Orçamento (R$)</label>
            <input className="w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" id="lead-budget" inputMode="decimal" onChange={(event) => updateForm("valorOrcamento", event.target.value)} pattern="^[0-9.]*([,][0-9]{0,2})?$" placeholder="0,00" type="text" value={form.valorOrcamento} />
            <p className="mt-1 text-xs text-slate-500">Contabilizado no pipeline em Atendimento/Orçamento e no faturamento quando Fechado.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="lead-message">Observação / Mensagem</label>
            <textarea className="min-h-28 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" id="lead-message" maxLength={5000} onChange={(event) => updateForm("mensagem", event.target.value)} placeholder="Contexto, interesse ou observações sobre o contato..." value={form.mensagem} />
          </div>

          <fieldset className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:col-span-2">
            <legend className="px-2 text-base font-black text-[#071a57]">Tarefas e lembretes</legend>
            <p className="mb-4 text-xs text-slate-500">O painel avisará 15 minutos antes de cada tarefa enquanto estiver aberto.</p>

            <div className="grid gap-3 md:grid-cols-[1fr_210px_auto]">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600" htmlFor="new-task-description">Descrição</label>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" id="new-task-description" maxLength={240} onChange={(event) => setTaskDraft((current) => ({ ...current, descricao: event.target.value }))} placeholder="Ex.: Retornar orçamento" type="text" value={taskDraft.descricao} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600" htmlFor="new-task-date">Data e hora</label>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" id="new-task-date" min={minimumDateTime} onChange={(event) => setTaskDraft((current) => ({ ...current, agendadaPara: event.target.value }))} type="datetime-local" value={taskDraft.agendadaPara} />
              </div>
              <button className="self-end rounded-xl bg-[#0b44e8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0836ba]" onClick={addTask} type="button">Anexar</button>
            </div>

            {form.tarefas.length ? (
              <div className="mt-4 space-y-3">
                {form.tarefas.map((task) => (
                  <div className="grid gap-2 rounded-xl border border-blue-100 bg-white p-3 md:grid-cols-[auto_1fr_210px_auto] md:items-center" key={task.id}>
                    <input aria-label={`Marcar tarefa ${task.descricao} como concluída`} checked={task.concluida} className="h-5 w-5 accent-emerald-600" onChange={(event) => updateTask(task.id, "concluida", event.target.checked)} type="checkbox" />
                    <input aria-label="Descrição da tarefa" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" maxLength={240} onChange={(event) => updateTask(task.id, "descricao", event.target.value)} type="text" value={task.descricao} />
                    <input aria-label="Data e hora da tarefa" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" min={task._persisted ? undefined : minimumDateTime} onChange={(event) => updateTask(task.id, "agendadaPara", event.target.value)} type="datetime-local" value={task.agendadaPara} />
                    <button className="rounded-lg px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50" onClick={() => removeTask(task.id)} type="button">Remover</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-blue-200 bg-white p-4 text-center text-sm text-slate-500">Nenhuma tarefa anexada.</p>
            )}
          </fieldset>

          <ScheduledTasks lead={lead} />

          {validationError || error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:col-span-2" role="alert">{validationError || error}</p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
            <button className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onClose} type="button">Cancelar</button>
            <button className="rounded-xl bg-gradient-to-r from-[#0b44e8] to-[#5013d6] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-700/20 hover:brightness-110 disabled:opacity-60" disabled={saving} type="submit">
              {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Salvar Lead"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
