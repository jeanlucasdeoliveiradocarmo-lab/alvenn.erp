import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorized, sendMessage } from "@/lib/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!authorized(request, process.env.CRON_SECRET)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const db = getAdminDb();
  const started = Date.now();
  const totals = { enviado: 0, erro: 0, ignorado: 0 };
  try {
    const due = await db.collectionGroup("tarefasAgendadas")
      .where("status", "==", "pendente").where("dataExecucao", "<=", Timestamp.now())
      .orderBy("dataExecucao").limit(100).get();
    for (const snapshot of due.docs) {
      if (Date.now() - started > 240000) break;
      const leadRef = snapshot.ref.parent.parent;
      if (!leadRef || leadRef.parent.path !== "leads") { totals.ignorado++; continue; }
      // Reserva terminal antes do efeito externo: não reenvia automaticamente após crash.
      const claimed = await db.runTransaction(async (tx) => {
        const current = await tx.get(snapshot.ref);
        const lead = await tx.get(leadRef);
        const task = current.data();
        if (!task || task.status !== "pendente" || task.dataExecucao.toMillis() > Date.now()) return null;
        tx.update(snapshot.ref, { status: "erro", erro: "Envio iniciado; se não houver confirmação, confira o provedor antes de reagendar.", iniciadoEm: FieldValue.serverTimestamp() });
        return { task, lead: lead.exists ? lead.data() : null };
      });
      if (!claimed) { totals.ignorado++; continue; }
      try {
        if (!claimed.lead) throw new Error("Lead excluído; envio cancelado.");
        if (typeof claimed.task.conteudoMensagem !== "string" || !claimed.task.conteudoMensagem.trim()) throw new Error("Mensagem vazia.");
        const providerId = await sendMessage(claimed.task.tipo, claimed.lead, claimed.task.conteudoMensagem, `task-${snapshot.id}`);
        await snapshot.ref.update({ status: "enviado", providerId, enviadoEm: FieldValue.serverTimestamp(), erro: FieldValue.delete() });
        totals.enviado++;
      } catch (error) {
        await snapshot.ref.update({ status: "erro", erro: error instanceof Error ? error.message : "Falha no envio.", atualizadoEm: FieldValue.serverTimestamp() });
        totals.erro++;
      }
    }
    return Response.json(totals);
  } catch { return Response.json({ error: "Falha no processamento. Verifique Firestore e índices.", ...totals }, { status: 500 }); }
}
