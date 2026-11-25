// Assets are embedded by scripts/build.mjs. PIN and records never enter the client bundle.
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
export default {async fetch(req,env){try{
 const url=new URL(req.url),p=url.pathname;
 if(!p.startsWith('/api/')){const path=p==='/'?'/index.html':p;return assets[path]===undefined?new Response('Não encontrado',{status:404}):new Response(assets[path],{headers:{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.json')?'application/json':'text/html','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'}});}
 if(req.method!=='GET'&&req.headers.get('origin')!==url.origin)return json({error:'Origem inválida.'},403);
 const bucket=env.BUCKET;if(!bucket)return json({error:'Armazenamento indisponível.'},503);
 const sid=(req.headers.get('cookie')||'').match(/(?:^|; )kpi_session=([a-f0-9-]+)/)?.[1];
 async function authed(){if(!sid)return false;const o=await bucket.get('sessions/'+sid);return o&&JSON.parse(await o.text()).expires>Date.now();}
 if(p==='/api/login'&&req.method==='POST'){
 const ip=req.headers.get('cf-connecting-ip')||'shared';const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const key='attempts/'+hash;const old=await bucket.get(key);let a=old?JSON.parse(await old.text()):{count:0,until:0};if(a.until<Date.now())a={count:0,until:Date.now()+900000};
 if(a.count>=5)return json({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
 const b=await req.json();if(!env.ENTRY_PIN||b.pin!==env.ENTRY_PIN){a.count++;await bucket.put(key,JSON.stringify(a));return json({error:'PIN incorreto.'},401);}
 await bucket.delete(key);const token=crypto.randomUUID();await bucket.put('sessions/'+token,JSON.stringify({expires:Date.now()+1800000}));return json({ok:true},200,{'Set-Cookie':`kpi_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`});
 }
 if(p==='/api/session')return json({authenticated:!!(await authed())});
 if(p==='/api/logout'&&req.method==='POST'){if(sid)await bucket.delete('sessions/'+sid);return json({ok:true},200,{'Set-Cookie':'kpi_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});}
 if(p==='/api/settings'){
 const key='settings/overview.json';
 if(req.method==='GET'){const o=await bucket.get(key);return json(o?{...JSON.parse(await o.text()),revision:o.etag}:{overview:null,revision:null});}
 if(req.method==='PUT'){
 if(!await authed())return json({error:'Digite o PIN para salvar as configurações.'},401);
 const b=await req.json();
 if(!Array.isArray(b.overview)||b.overview.length<1||b.overview.length>12||new Set(b.overview).size!==b.overview.length||b.overview.some(id=>{if(typeof id!=='string'||!/^\d+:\d+$/.test(id))return true;const[p,m]=id.split(':').map(Number);return !presets[p]?.[3]?.[m];}))return json({error:'Selecione de 1 a 12 gráficos válidos, sem repetir.'},400);
 const o=await bucket.get(key);if((o?.etag??null)!==b.revision)return json({error:'As configurações mudaram em outra janela. Reabra Configurações antes de salvar.'},409);
 const types=b.types??{};
 if(typeof types!=='object'||Array.isArray(types)||Object.entries(types).some(([key,type])=>!b.overview.includes(key)||!['line','bars'].includes(type)))return json({error:'Tipo de gráfico inválido.'},400);
 const doc={overview:b.overview,types,updatedAt:new Date().toISOString()};
 const saved=await bucket.put(key,JSON.stringify(doc),{onlyIf:o?{etagMatches:o.etag}:{etagDoesNotMatch:'*'}});
 if(!saved)return json({error:'As configurações mudaram. Reabra Configurações.'},409);
 return json({...doc,revision:saved.etag});
 }
 return json({error:'Método inválido.'},405);
 }
 const year=Number(url.searchParams.get('year'));if(!Number.isInteger(year)||year<2020||year>2100)return json({error:'Ano inválido.'},400);
 const key='records/'+year+'.json';
 if(p==='/api/data'&&req.method==='GET'){const o=await bucket.get(key);return json(o?{...JSON.parse(await o.text()),revision:o.etag}:{year,months:{},revision:null});}
 if(p==='/api/data'&&req.method==='PUT'){
 if(!await authed())return json({error:'Acesso expirado. Digite o PIN novamente.'},401);
 if(Number(req.headers.get('content-length'))>30000)return json({error:'Lançamento muito grande.'},413);
 const b=await req.json();if(!Number.isInteger(b.month)||b.month<0||b.month>11)return json({error:'Mês inválido.'},400);
 // Import the same definitions used by the form, from the embedded source.
 const schema={fields,validate};
 if(!b.values||Object.keys(b.values).length!==schema.fields.length||schema.fields.some(([id])=>!Object.hasOwn(b.values,id)))return json({error:'Preencha o formulário completo.'},400);
 schema.validate(b.values);
 const state=b.status??'draft';if(!['draft','closed'].includes(state))return json({error:'Situação inválida.'},400);
 if(state==='closed'){validateClosure(b.values);const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'numeric'}).formatToParts(new Date());const currentYear=Number(parts.find(p=>p.type==='year').value),currentMonth=Number(parts.find(p=>p.type==='month').value)-1;if(year>currentYear||(year===currentYear&&b.month>=currentMonth))return json({error:'Só é possível encerrar meses já concluídos.'},400);}
 const o=await bucket.get(key);if((o?.etag??null)!==b.revision)return json({error:'Os dados foram alterados em outra janela. Reabra o mês antes de salvar.'},409);
 const doc=o?JSON.parse(await o.text()):{year,months:{}};
 const previous=doc.months[b.month]||null;
 doc.history??={};doc.history[b.month]??=[];
 const updatedAt=new Date().toISOString();
 doc.history[b.month].push({id:crypto.randomUUID(),savedAt:updatedAt,previous});
 doc.months[b.month]={values:b.values,updatedAt,status:state};
 const result=await bucket.put(key,JSON.stringify(doc),{onlyIf:o?{etagMatches:o.etag}:{etagDoesNotMatch:'*'}});
 if(!result)return json({error:'Outro lançamento foi salvo. Reabra o mês.'},409);
 // The historical snapshot and new values are committed atomically in the same object.
 return json({...doc,revision:result.etag});
 }
 return json({error:'Não encontrado.'},404);
 }catch(e){return json({error:e.message||'Não foi possível salvar. Tente novamente.'},400);}}};
