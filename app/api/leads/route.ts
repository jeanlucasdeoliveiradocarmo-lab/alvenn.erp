import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorized, phoneNumber, sendMessage } from "@/lib/automation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  // Chamado pelo backend do site. Nunca exponha LEADS_API_KEY no navegador.
  if (!authorized(request, process.env.LEADS_API_KEY)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const clienteId = process.env.LEADS_CLIENT_ID;
  if (!clienteId) return Response.json({ error: "Captação não configurada." }, { status: 503 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido." }, { status: 400 }); }
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const mensagem = typeof body?.mensagem === "string" ? body.mensagem.trim() : "";
  let telefone: string;
  try { telefone = phoneNumber(typeof body?.telefone === "string" ? body.telefone : ""); }
  catch { return Response.json({ error: "Telefone inválido." }, { status: 400 }); }
  if (!nome || nome.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || mensagem.length > 5000) {
    return Response.json({ error: "Revise nome, e-mail e mensagem." }, { status: 400 });
  }
  let ref;
  try {
    ref = await getAdminDb().collection("leads").add({
      clienteId, nome, email, telefone, mensagem, origem: "Landing Page", status: "novo_lead",
      valorOrcamentoCentavos: 0, moeda: "BRL", tarefas: [],
      criadoEm: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  } catch { return Response.json({ error: "Não foi possível salvar o lead." }, { status: 500 }); }
  const welcome = `Olá, ${nome}! Recebemos seu contato na Alvenn. Nossa equipe entrará em contato em breve. Obrigado!`;
  const outcomes = await Promise.all(["email", "whatsapp"].map(async (tipo) => {
    try {
      const providerId = await sendMessage(tipo, { email, telefone }, welcome, `welcome-${ref.id}-${tipo}`, "Bem-vindo à Alvenn!");
      return [tipo, { status: "enviado", providerId }];
    } catch (error) { return [tipo, { status: "erro", erro: error instanceof Error ? error.message : "Falha no envio." }]; }
  }));
  const automacoes = Object.fromEntries(outcomes);
  let registroSalvo = true;
  try { await ref.update({ automacoes, updatedAt: FieldValue.serverTimestamp() }); }
  catch { registroSalvo = false; }
  // O lead já existe: não devolver 500 por falha posterior e incentivar duplicação.
  return Response.json({ id: ref.id, automacoes, registroSalvo }, { status: 201 });
}
