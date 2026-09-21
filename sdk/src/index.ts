export type AxyneraConfig={apiKey:string;baseURL:string;headers?:Record<string,string>};
export class AxyneraError extends Error{status:number;constructor(message:string,status:number){super(message);this.name="AxyneraError";this.status=status}}
export class Axynera{
 readonly chat:{completions:{create:(body:any)=>Promise<any>}};
 readonly messages:{create:(body:any)=>Promise<any>};
 readonly models:{list:()=>Promise<any>};
 private key:string; private base:string; private extra:Record<string,string>;
 constructor(config:AxyneraConfig){this.key=config.apiKey;this.base=config.baseURL.replace(/\/$/,"");this.extra=config.headers||{};this.chat={completions:{create:(b)=>this.request("/v1/chat/completions",b)}};this.messages={create:(b)=>this.request("/v1/messages",b)};this.models={list:()=>this.request("/v1/models",undefined,"GET")}}
 private async request(path:string,body?:any,method="POST"){const r=await fetch(this.base+path,{method,headers:{"content-type":"application/json","authorization":`Bearer ${this.key}`,...this.extra},body:method==="GET"?undefined:JSON.stringify(body)});if(!r.ok)throw new AxyneraError(await r.text()||r.statusText,r.status);if(body?.stream)return this.stream(r);return r.json()}
 private async stream(r:Response){if(!r.body)throw new AxyneraError("Streaming body unavailable",500);const reader=r.body.getReader();const decoder=new TextDecoder();let buffer="";return {async *[Symbol.asyncIterator](){while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const parts=buffer.split(/\r?\n\r?\n/);buffer=parts.pop()||"";for(const part of parts){const line=part.split(/\r?\n/).find(x=>x.startsWith("data:"));if(!line)continue;const data=line.slice(5).trim();if(data==="[DONE]")return;try{yield JSON.parse(data)}catch{}}}}}}
}
export default Axynera;