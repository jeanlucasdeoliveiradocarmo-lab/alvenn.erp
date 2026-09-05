# Alvenn ERP — automações nativas

Projeto completo adaptado do CRM Beta. As rotas solicitadas estão em `app/api/leads/route.ts` e `app/api/cron/process-tasks/route.ts`. O helper `lib/automation.ts` é parte necessária da implementação; usa a API HTTP oficial do Resend e a Z-API, sem SDK adicional.

## Configuração

1. Instale com `pnpm install` e copie `.env.example` para `.env.local` somente no seu ambiente. Configure as variáveis públicas do Firebase e as credenciais Admin.
2. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (domínio verificado), `ZAPI_INSTANCE_ID`, `ZAPI_INSTANCE_TOKEN` e `ZAPI_CLIENT_TOKEN` (token de segurança da conta).
3. Gere segredos distintos e fortes para `CRON_SECRET` e `LEADS_API_KEY`. Configure `LEADS_CLIENT_ID` com o UID Firebase Auth do responsável pelos leads. O clienteId enviado no corpo não é usado para decidir a propriedade.
4. Publique regras e índices no projeto Firebase correto: `firebase deploy --only firestore:rules,firestore:indexes --project SEU_PROJECT_ID`. Aguarde a construção do índice antes de executar o cron.
5. Configure as mesmas variáveis na Vercel e publique o projeto. O arquivo `vercel.json` incluído executa `GET /api/cron/process-tasks` na hora cheia: `0 * * * *`. O cron nativo só executa em produção, com Authorization Bearer definido por CRON_SECRET.
6. Execute `pnpm build` antes de publicar e `pnpm dev` para desenvolvimento.

O intervalo horário exige plano compatível (Pro); o Hobby limita a frequência a uma vez por dia. Para execução diária use `0 12 * * *` (12h UTC). Para cinco minutos em plano compatível use `*/5 * * * *`. Com frequência horária, uma tarefa às 10:05 será elegível na execução das 11h, sujeita a atrasos e backlog; não é envio exato no minuto solicitado.

## Captação

O backend do site deve enviar POST /api/leads com os cabeçalhos `Content-Type: application/json` e `Authorization: Bearer <LEADS_API_KEY>`:

```json
{
  "nome": "Maria Silva",
  "email": "maria@example.com",
  "telefone": "5511999999999",
  "mensagem": "Gostaria de conhecer a solução"
}
```

Não coloque LEADS_API_KEY no JavaScript público do formulário. Encaminhe a requisição pelo backend do site e aplique nele proteção contra abuso. A rota antiga /api/v1/leads usa a mesma implementação e agora também exige autenticação; atualize a integração anterior.

O lead é persistido com status `novo_lead` antes de qualquer envio. A interface entende esse status como Novo Lead, mantendo compatibilidade com registros antigos `novo`. O retorno 201 inclui id, resultado de cada canal em automacoes e registroSalvo. Uma falha de e-mail não impede WhatsApp. Não repita a criação após receber 201: o lead existe mesmo se um canal falhar. A captação não deduplica submissões independentes do formulário. `enviado` significa aceito pelo provedor, sem confirmação de entrega ou leitura.

## Estrutura no Firestore

Use a subcoleção **leads/{leadId}/tarefasAgendadas/{taskId}**, vinculada ao documento do lead. Evita regravar um array inteiro e permite consultar tarefas vencidas com collectionGroup. O array legado `tarefas` permanece exclusivamente para lembretes locais.

```typescript
// leads/{leadId}
{
  clienteId: "UID_FIREBASE_AUTH",
  nome: "Maria Silva",
  email: "maria@example.com",
  telefone: "5511999999999",
  status: "novo_lead",
  valorOrcamentoCentavos: 0,
  moeda: "BRL",
  tarefas: []
}
// leads/{leadId}/tarefasAgendadas/{taskId}
{
  tipo: "whatsapp", // ou "email"
  dataExecucao: Timestamp.fromDate(new Date("2026-10-05T14:00:00-03:00")),
  conteudoMensagem: "Olá, Maria! Podemos agendar uma conversa?",
  status: "pendente", // pendente | enviado | erro
  criadoEm: serverTimestamp()
}
```

O servidor acrescenta iniciadoEm, enviadoEm, providerId ou erro. Datas são Timestamp do Firestore; o formulário interpreta a hora no fuso do dispositivo e persiste o instante correspondente. Abra Editar no lead salvo e use Envios automáticos. A tarefa é salva imediatamente pelo botão Agendar envio, independentemente do botão Salvar Alterações do lead. O destino utilizado é o contato salvo no lead no momento de processar; salve alterações do contato antes de agendar.

## Concorrência e falhas

Cada execução consulta até 100 pendências vencidas, em ordem de data. Processa sequencialmente por até cerca de 240 segundos, com timeout de 15 segundos por chamada externa; o restante fica para a próxima execução. Dimensione a frequência conforme o volume. As regras permitem ao proprietário criar e ler tarefas; somente o Admin SDK altera o resultado. A consulta de leads agora filtra clienteId conforme essas regras.

A transação reserva a tarefa usando status erro e uma observação de envio iniciado antes da chamada ao provedor. Assim duas execuções não enviam a mesma tarefa. Sucesso confirmado muda para enviado. Um encerramento inesperado mantém erro para revisão, sem repetir automaticamente. Isso favorece evitar duplicação e pode exigir recuperação manual se houver interrupção antes do envio. A Resend recebe uma chave de idempotência; a Z-API não oferece garantia equivalente neste endpoint. Não há garantia de exactly-once entre Firestore e serviços externos.

Para tarefas em erro, confira o painel do provedor antes de criar uma nova tarefa. Não existe retentativa automática nem edição/exclusão de tarefas na interface nesta entrega. Lead excluído gera erro e não é enviado; as subcoleções não são removidas automaticamente pelo Firestore. O cron não faz limpeza de histórico.

## Referências

- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://developer.z-api.io/message/send-text
- https://resend.com/docs/dashboard/emails/idempotency-keys

## Validação desta entrega

- `pnpm build`: aprovado, incluindo compilação, TypeScript e geração de páginas. Foram usadas variáveis públicas fictícias somente no processo de build.
- `node tests/automations.cjs`: aprovado. Testes simulados de autenticação, normalização de telefone com DDD 55, idempotência Resend, erro HTTP do provedor, propriedade do lead, falha parcial e concorrência do cron.
- Envios reais, permissões no Firebase implantado e validação visual interativa não foram executados. Exigem configuração do ambiente e acesso autenticado.
