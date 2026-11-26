import {groups,fields,parseValue,validate,validateClosure} from './fields.js';
import {presets} from './catalogue.js';
import {aggregate,readMonthlyValue} from './metrics.js';

export function setupEntry({apply,format,onClose}){
const panel=document.getElementById('entryPanel'),dash=document.getElementById('dashboard');let doc,dirty=false,working=false;
const current=new Date();
panel.innerHTML=`<div class="entry-head"><h1 id="entryTitle">Inserir dados</h1><button class="control" id="entryClose">Voltar aos gráficos</button></div>
<form id="pinForm" class="entry-login"><label for="entryPin">PIN de acesso</label><input id="entryPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autocomplete="off"><button class="control primary">Entrar</button></form>
<div id="entryContent" hidden><div class="entry-tools"><label for="entryYear">Ano<input id="entryYear" type="number" min="2020" max="2100" value="${Number(localStorage.getItem('kpi-view-year'))||current.getFullYear()}"></label><label for="entryMonth">Mês<select id="entryMonth">${Array.from({length:12},(_,i)=>`<option value="${i}">${new Date(2027,i,1).toLocaleString('pt-BR',{month:'long'})}</option>`).join('')}</select></label><button class="control" id="loadEntry">Abrir mês</button><button class="control" id="lockEntry">Bloquear</button></div><p id="entryPeriod"></p><label for="entryState">Situação do mês <select id="entryState"><option value="draft">Em aberto</option><option value="closed">Encerrado</option></select></label><p class="note">Encerre somente após conferir todos os dados do mês. Comparações usam meses encerrados.</p><details><summary>Histórico e recuperação</summary><p>Recupere uma versão anterior no formulário, confira e salve para confirmar a restauração.</p><div id="entryHistory"></div></details><p class="note">Deixe em branco o que ainda não foi apurado. Digite 0 quando o resultado for zero. Valores em reais e horas; as taxas são calculadas.</p><form id="entryForm"><div class="entry-groups">${Object.entries(groups).map(([name,items])=>`<fieldset><legend>${name}</legend>${items.map(([id,label,type])=>`<label for="field${id}">${label}${type==='money'?' (R$)':type==='hours'?' (horas)':''}<input id="field${id}" name="${id}" inputmode="${type?'decimal':'numeric'}" autocomplete="off"></label>`).join('')}</fieldset>`).join('')}</div><div class="entry-save"><button class="control primary" id="saveEntry">Revisar lançamento</button><span id="entrySaved"></span></div></form><dialog id="reviewEntry" aria-labelledby="reviewTitle"><h2 id="reviewTitle">Conferir lançamento</h2><p id="reviewPeriod"></p><section aria-labelledby="reviewImpactTitle"><h3 id="reviewImpactTitle">Alterações nos indicadores do mês</h3><div id="reviewImpact"></div></section><details><summary>Conferir valores informados</summary><div id="reviewValues"></div></details><div class="entry-tools"><button class="control" id="cancelReview">Voltar</button><button class="control primary" id="confirmEntry">Salvar e atualizar gráficos</button></div></dialog></div><p id="entryStatus" role="status" aria-live="polite"></p>`;
const $=id=>document.getElementById(id);let pending,pendingState;
async function api(path,options){const r=await fetch(path,options);const b=await r.json();if(!r.ok){if(r.status===401){$('pinForm').hidden=false;$('entryContent').hidden=true;}throw Error(b.error);}return b;}
const msg=s=>$('entryStatus').textContent=s;
function title(){return `${$('entryMonth').selectedOptions[0].text} de ${$('entryYear').value}`;}
async function load(){if(working)return;if(dirty&&!confirm('Descartar as alterações não salvas?'))return;working=true;msg('Carregando…');try{const year=Number($('entryYear').value);if(!Number.isInteger(year)||year<2020||year>2100)throw Error('Informe um ano entre 2020 e 2100.');doc=await api('/api/data?year='+year);doc.activeMonth=Number($('entryMonth').value);$('entryState').value=doc.months[doc.activeMonth]?.status||'draft';for(const [id,,type]of fields){let v=doc.months[doc.activeMonth]?.values[id]??null;if(v!==null&&type==='hours')v=v/60;$('field'+id).value=v===null?'':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:6}).format(v);}
$('entryPeriod').textContent='Lançamento: '+title();$('entrySaved').textContent=doc.months[doc.activeMonth]?'Salvo em '+new Date(doc.months[doc.activeMonth].updatedAt).toLocaleString('pt-BR'): 'Sem lançamento';renderHistory();dirty=false;msg('');}catch(e){doc=null;msg(e.message);}finally{working=false;}}
function renderHistory(){
 const versions=[...(doc.history?.[doc.activeMonth]||[])].reverse();
 $('entryHistory').replaceChildren();
 if(!versions.length){$('entryHistory').textContent='Nenhuma alteração registrada nesta versão do histórico.';return;}
 for(const version of versions){if(!version.previous)continue;const button=document.createElement('button');button.type='button';button.className='control';button.textContent='Recuperar versão anterior a '+new Date(version.savedAt).toLocaleString('pt-BR');button.onclick=()=>{if(dirty&&!confirm('Substituir os valores não salvos pela versão escolhida?'))return;for(const[id,,type]of fields){const value=version.previous.values[id];$('field'+id).value=value==null?'':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:6}).format(type==='hours'?value/60:value);}$('entryState').value=version.previous.status||'draft';dirty=true;$('entrySaved').textContent='Versão recuperada para revisão; ainda não salva';msg('Confira os valores e clique em Revisar lançamento.');};$('entryHistory').append(button);}
 if(!$('entryHistory').children.length)$('entryHistory').textContent='Primeiro lançamento; ainda não há uma versão anterior.';
}
$('entryOpen').onclick=async()=>{panel.hidden=false;dash.hidden=true;document.getElementById('settingsPanel').hidden=true;try{const s=await api('/api/session');$('pinForm').hidden=s.authenticated;$('entryContent').hidden=!s.authenticated;if(s.authenticated)await load();else $('entryPin').focus();}catch(e){msg(e.message);}};
$('pinForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:$('entryPin').value})});$('entryPin').value='';$('pinForm').hidden=true;$('entryContent').hidden=false;await load();}catch(e){msg(e.message);}};
$('entryClose').onclick=()=>{if(dirty&&!confirm('Descartar as alterações não salvas?'))return;dirty=false;panel.hidden=true;dash.hidden=false;onClose?.();};
$('loadEntry').onclick=load;
$('lockEntry').onclick=async()=>{if(dirty&&!confirm('Descartar as alterações e bloquear?'))return;await api('/api/logout',{method:'POST'});dirty=false;$('pinForm').hidden=false;$('entryContent').hidden=true;msg('Acesso bloqueado.');};
$('entryState').onchange=()=>{dirty=true;$('entrySaved').textContent='Alterações não salvas';};
$('entryForm').oninput=()=>{dirty=true;$('entrySaved').textContent='Alterações não salvas';};

function renderImpact(before,after){
 const impacts=[];
 for(const [sector,panel,,metrics] of presets){
  for(const metric of metrics){
   const previous=aggregate(metric,[0],row=>readMonthlyValue(before,row)).value;
   const next=aggregate(metric,[0],row=>readMonthlyValue(after,row)).value;
   if(previous===next)continue;
   const item=document.createElement('li');
   const name=document.createElement('strong');
   name.textContent=metric.name;
   const location=document.createElement('span');
   location.textContent=sector+' · '+panel;
   const values=document.createElement('span');
   values.textContent=format(previous,metric.unit)+' → '+format(next,metric.unit);
   item.append(name,location,values);
   impacts.push(item);
  }
 }
 const content=document.createElement(impacts.length?'ul':'p');
 if(impacts.length)content.append(...impacts);
 else content.textContent='Nenhum valor de indicador muda neste lançamento.';
 $('reviewImpact').replaceChildren(content);
}

$('entryForm').onsubmit=e=>{e.preventDefault();if(working||!doc)return;try{if(doc.year!==Number($('entryYear').value)||doc.activeMonth!==Number($('entryMonth').value))throw Error('Clique em Abrir mês antes de preencher outro período.');pending={};for(const [id,label,type]of fields){try{pending[id]=parseValue($('field'+id).value,type);}catch(e){$('field'+id).focus();throw Error(label+': '+e.message);}}validate(pending);if($('entryState').value==='closed')validateClosure(pending);$('reviewPeriod').textContent=title()+' · '+($('entryState').value==='closed'?'Encerrado':'Em aberto')+ (doc.months[doc.activeMonth]?' — substituir lançamento existente':'');$('reviewValues').replaceChildren(...fields.map(([id,label,type])=>{const p=document.createElement('p');const n=pending[id];p.textContent=label+': '+(n===null?'Não apurado':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:4}).format(type==='hours'?n/60:n))+(n===null?'':type==='money'?' R$':type==='hours'?' h':'');return p;}));renderImpact(doc.months[doc.activeMonth]?.values??{},pending);pendingState=$('entryState').value;$('reviewEntry').showModal();msg('');}catch(e){msg(e.message);}};
$('reviewEntry').addEventListener('cancel',e=>{if(working)e.preventDefault();});
$('cancelReview').onclick=()=>{if(!working)$('reviewEntry').close();};
$('confirmEntry').onclick=async()=>{if(working)return;working=true;$('confirmEntry').disabled=true;try{const result=await api('/api/data?year='+doc.year,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({month:doc.activeMonth,values:pending,revision:doc.revision,status:pendingState})});doc={...result,activeMonth:doc.activeMonth};dirty=false;renderHistory();apply(result);$('reviewEntry').close();$('entrySaved').textContent='Salvo';msg('Lançamento salvo. Os gráficos foram atualizados.');}catch(e){$('reviewEntry').close();msg(e.message);}finally{working=false;$('confirmEntry').disabled=false;}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
}
