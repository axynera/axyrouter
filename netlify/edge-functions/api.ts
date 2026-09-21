import { Hono } from "hono";

type Credential={apiKey:string;baseUrl?:string;enabled?:boolean};
type Provider={baseUrl:string;credentials:Credential[]};
type ModelConfig={name:string;provider:string;model:string;credentials?:number[]};
const app=new Hono();
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}});
function envJson<T>(key:string,fallback:T):T{try{return JSON.parse(Netlify.env.get(key)||"") as T}catch{return fallback}}
const providers=()=>envJson<Record<string,Provider>>("AXY_PROVIDERS",{});
const models=()=>envJson<Record<string,ModelConfig>>("AXY_MODELS",{});
function resolve(body:any){const cfg=models()[body.model];if(!cfg)throw new Error(`Unknown model: ${body.model}`);const p=providers()[cfg.provider];if(!p)throw new Error(`Provider not configured: ${cfg.provider}`);const list=cfg.credentials?.map(i=>p.credentials[i]).filter(Boolean)||p.credentials;const c=list.filter(x=>x.enabled!==false&&x.apiKey)[Math.floor(Math.random()*list.filter(x=>x.enabled!==false&&x.apiKey).length)];if(!c)throw new Error("No enabled credentials");return{cfg,c,url:(c.baseUrl||p.baseUrl).replace(/\/$/,"")+"/chat/completions"}}
function err(message:string,status=400,type="invalid_request_error"){return json({error:{message,type}},status)}
function aerr(message:string,status=400,type="invalid_request_error"){return json({type:"error",error:{type,message}},status)}
async function call(body:any){const {cfg,c,url}=resolve(body);return{cfg,response:await fetch(url,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${c.apiKey}`},body:JSON.stringify({...body,model:cfg.model})})}}
function anthropicToOpenAI(b:any){const system=b.system?[{role:"system",content:b.system}]:[];return{model:b.model,messages:[...system,...(b.messages||[])],max_tokens:b.max_tokens??1024,temperature:b.temperature,top_p:b.top_p,stream:b.stream??false}}
function toAnthropic(d:any,model:string){const x=d?.choices?.[0],u=d?.usage;return{id:d?.id||`msg_${crypto.randomUUID()}`,type:"message",role:"assistant",model,content:[{type:"text",text:typeof x?.message?.content==="string"?x.message.content:""}],stop_reason:x?.finish_reason==="stop"?"end_turn":x?.finish_reason||null,stop_sequence:null,usage:{input_tokens:u?.prompt_tokens??0,output_tokens:u?.completion_tokens??0}}}
function streamHeaders(h:Headers){h.set("content-type","text/event-stream; charset=utf-8");h.set("cache-control","no-cache, no-transform");h.delete("content-length");return h}

app.get("/health",c=>c.json({ok:true,service:"AxyRouter",runtime:"Netlify Edge",framework:"Hono"}));
app.get("/v1/models",c=>c.json({object:"list",data:Object.values(models()).map((m,i)=>({id:m.name,object:"model",created:0,owned_by:"axynity",index:i}))}));

app.post("/v1/chat/completions",async c=>{try{const b=await c.req.json(),{response}=await call(b);const h=new Headers(response.headers);if(b.stream)streamHeaders(h);return new Response(response.body,{status:response.status,headers:h})}catch(e){return err(e instanceof Error?e.message:"Gateway error",500,"gateway_error")}});

app.post("/v1/messages",async c=>{try{const b=await c.req.json(),{response,cfg}=await call(anthropicToOpenAI(b));if(b.stream){const h=streamHeaders(new Headers(response.headers));return new Response(response.body,{status:response.status,headers:h})}if(!response.ok)return aerr(await response.text()||"Upstream error",response.status,"api_error");return json(toAnthropic(await response.json(),cfg.name))}catch(e){return aerr(e instanceof Error?e.message:"Gateway error",500,"api_error")}});

app.all("*",c=>c.json({error:{message:"Not found",type:"not_found"}},404));
export default app;
