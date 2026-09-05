const fs=require('fs'), vm=require('vm'), assert=require('node:assert/strict');
const ts=require('typescript');
function load(file,mocks={}){const m={exports:{}}; const code=ts.transpileModule(fs.readFileSync(require('path').join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{module:m,exports:m.exports,require:n=>mocks[n]||require(n),process,Buffer,Request,Response,AbortSignal,fetch:(...a)=>global.fetch(...a),console});return m.exports;}
(async()=>{
const automation=load('lib/automation.ts');
assert.equal(automation.authorized(new Request('https://test'),undefined),false);
assert.equal(automation.authorized(new Request('https://test',{headers:{authorization:'Bearer xyz'}}),'xyz'),true);
assert.equal(automation.phoneNumber('(55) 99999-9999'),'5555999999999');
Object.assign(process.env,{RESEND_API_KEY:'test',RESEND_FROM_EMAIL:'test@example.com',ZAPI_INSTANCE_ID:'test',ZAPI_INSTANCE_TOKEN:'test',ZAPI_CLIENT_TOKEN:'test',LEADS_API_KEY:'secret',LEADS_CLIENT_ID:'owner',CRON_SECRET:'cron'});
let requestData;
global.fetch=async(url,opts)=>{requestData={url,...opts};return Response.json({id:'email-id'})};
assert.equal(await automation.sendMessage('email',{email:'a@example.com'},'hello','unique'),'email-id');
assert.equal(requestData.headers['Idempotency-Key'],'unique');
global.fetch=async()=>Response.json({error:'bad'},{status:429});
await assert.rejects(()=>automation.sendMessage('email',{email:'a@example.com'},'hello','unique'),/429/);
let saved, channels=[];
const leadRoute=load('app/api/leads/route.ts',{'@/lib/automation':{...automation,sendMessage:async(tipo)=>{channels.push(tipo);if(tipo==='email')throw Error('failed');return 'wa-id'}},'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=>0}},'@/lib/firebase-admin':{getAdminDb:()=>({collection:()=>({add:async(data)=>{saved=data;return {id:'lead1',update:async()=>{}}}})})}});
assert.equal((await leadRoute.POST(new Request('https://test',{method:'POST'}))).status,401);
const response=await leadRoute.POST(new Request('https://test',{method:'POST',headers:{authorization:'Bearer secret'},body:JSON.stringify({nome:'Maria',email:'m@example.com',telefone:'11999999999',clienteId:'attacker'})}));
assert.equal(response.status,201);assert.equal(saved.status,'novo_lead');assert.equal(saved.clienteId,'owner');assert.equal(channels.length,2);assert.equal((await response.json()).automacoes.email.status,'erro');
let state={status:'pendente',dataExecucao:{toMillis:()=>0},tipo:'whatsapp',conteudoMensagem:'hello'};let sends=0;let queue=Promise.resolve();
const leadRef={parent:{path:'leads'}};const ref={parent:{parent:leadRef},update:async(data)=>Object.assign(state,data)};
const snap={id:'task1',ref};const db={collectionGroup:()=>({where(){return this},orderBy(){return this},limit(){return this},get:async()=>({docs:[snap]})}),runTransaction:fn=>{const run=queue.then(()=>fn({get:async(r)=>r===leadRef?{exists:true,data:()=>({telefone:'5511999999999'})}:{data:()=>({...state})},update:(_,data)=>Object.assign(state,data)}));queue=run.catch(()=>{});return run}};
const cron=load('app/api/cron/process-tasks/route.ts',{'@/lib/automation':{...automation,sendMessage:async()=>{sends++;return 'wa-id'}},'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=>0,delete:()=>null},Timestamp:{now:()=>0}},'@/lib/firebase-admin':{getAdminDb:()=>db}});
const req=()=>new Request('https://test',{headers:{authorization:'Bearer cron'}});
await Promise.all([cron.GET(req()),cron.GET(req())]);assert.equal(sends,1);assert.equal(state.status,'enviado');
console.log('PASS: auth, phone DDD55, provider idempotency/errors, capture ownership/partial failure, concurrent cron single send');
})().catch(e=>{console.error(e);process.exitCode=1});

