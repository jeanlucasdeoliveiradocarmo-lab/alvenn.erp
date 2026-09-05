"use client";
import { useEffect, useState } from "react";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDateTime, getMinimumDateTimeLocal } from "@/lib/crm";

export function ScheduledTasks({ lead }) {
  const [tasks, setTasks] = useState([]);
  const [tipo, setTipo] = useState("whatsapp");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!lead?.id) return;
    return onSnapshot(query(collection(db, "leads", lead.id, "tarefasAgendadas"), orderBy("dataExecucao", "desc")),
      (snapshot) => setTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
      () => setError("Não foi possível carregar as automações."));
  }, [lead?.id]);
  async function schedule() {
    setError("");
    const when = new Date(date);
    if (!Number.isFinite(when.getTime()) || when.getTime() <= Date.now() || !message.trim()) {
      setError("Informe uma data futura e a mensagem."); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "leads", lead.id, "tarefasAgendadas"), {
        tipo, dataExecucao: Timestamp.fromDate(when), conteudoMensagem: message.trim(), status: "pendente", criadoEm: serverTimestamp(),
      });
      setMessage(""); setDate("");
    } catch { setError("Não foi possível agendar. Confira as permissões e tente novamente."); }
    finally { setSaving(false); }
  }
  return <fieldset className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:col-span-2">
    <legend className="px-2 text-base font-black text-[#071a57]">Envios automáticos</legend>
    {!lead?.id ? <p className="text-sm text-slate-500">Salve o lead e abra Editar para agendar mensagens.</p> : <>
      <p className="mb-3 text-xs text-slate-500">Horário local deste dispositivo. O envio ocorre na próxima execução do agendador. A tarefa é salva imediatamente.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>Canal<select className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option></select></label>
        <label>Data e hora<input className="mt-1 w-full rounded-xl border border-slate-300 p-3" type="datetime-local" min={getMinimumDateTimeLocal()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <label className="mt-3 block">Mensagem<textarea className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
      <button type="button" disabled={saving} onClick={schedule} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-60">{saving ? "Agendando..." : "Agendar envio"}</button>
      {tasks.length === 0 && <p className="mt-3 text-sm text-slate-500">Nenhum envio agendado.</p>}
      <ul className="mt-3 space-y-2">{tasks.map((task) => <li key={task.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><strong>{task.tipo === "email" ? "E-mail" : "WhatsApp"} · {formatDateTime(task.dataExecucao)} · {task.status}</strong><p className="whitespace-pre-wrap break-words">{task.conteudoMensagem}</p>{task.erro && <p className="mt-1 text-rose-600">{task.erro}</p>}</li>)}</ul>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
  </fieldset>;
}
