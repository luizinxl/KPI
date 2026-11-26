import {presets} from './catalogue.js';
import {setupSettings} from './settings.js';
import {aggregate,compare,metricDefinition} from './metrics.js';
import {setupEntry} from './entry.js';
import {openWorkbook,batchWorkbook} from './workbook.js';

const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const full=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const sectorTheme={
  'Vendas':'sales', 'Compras':'supply', 'Produção':'production', 'Qualidade':'quality',
  'Assistência técnica':'service', 'Microscopia':'microscopy',
};
const overview=-1;
const defaultOverviewCards=[
  ['Vendas','Faturamento',0,'line'],
  ['Compras','Pedidos e atrasos',0,'bars'],
  ['Produção','Volume produzido',0,'bars'],
  ['Qualidade','Reclamações e NNC',0,'bars'],
  ['Assistência técnica','Envios e atrasos',0,'line'],
  ['Produção','Máquinas paradas',0,'line'],
].map(([sector,label,metric,trend])=>({
  sector,
  panel:presets.findIndex(([name,presetLabel])=>name===sector && presetLabel===label),
  metric,
  trend,
}));
let overviewCards=defaultOverviewCards;
function recommendedTrend(key){
  const [panel,metric]=key.split(':').map(Number);
  const defaults=defaultOverviewCards.find(card=>card.panel===panel&&card.metric===metric);
  return defaults?.trend ?? (presets[panel][3][metric].unit==='percent'?'line':'bars');
}
const tvSlides=[
  {panel:overview,metric:0},
  ...presets.flatMap(([, , , metrics],panel)=>metrics.map((_,metric)=>({panel,metric}))),
];
const reportGroups={
  'Vendas':['VDS-FAT','VDS-ATR','VDS-DV-FAT','VDS-RC'],
  'Compras':['COP-ATR','COP-PRA','COP-PMP','COP-RC'],
  'Produção':['PRO-EQP','PRO-RC','QLD-DV.G',"BO'S",'ELE-RC','USI-RC','AJU-RC','FUN-RC','PIN-RC','EST-RC','FOR-RC','REF-RC','CEN-RC','MON-RC','OSM-RC','CAP-RC','DES-RC','MAN-RC','MES-RC','AGI-RC','BAN-RC','CAM-RC','DEI-RC','BOM-RC','FUL-FOT-RC'],
  'Manutenção':['MAN-HTP NEW'],
  'Assistência técnica':['AST-EPA','AST-GAR','AST-PGR','AST-RC'],
  'Microscopia':['MIC-EPA','MIC-GO','MIC-RC'],
  'Demais setores':['DIR-FAT','ENG-RC','NAC-RC','OUT-RC','RH-TRE'],
};
const reportLabels={
  'VDS-FAT':'Faturamento','VDS-ATR':'Atrasos na entrega','VDS-DV-FAT':'Devoluções comerciais','VDS-RC':'Reclamações de Vendas',
  'COP-ATR':'Pedidos em atraso','COP-PRA':'Lotes não conformes','COP-PMP':'Custo de matéria-prima','COP-RC':'Reclamações de Compras',
  'PRO-EQP':'Produção por colaborador','PRO-RC':'Reclamações de Produção','QLD-DV.G':'Devoluções da produção',"BO'S":'Solicitações de melhoria','MAN-HTP NEW':'Máquinas paradas',
  'AST-EPA':'Atrasos da assistência','AST-GAR':'Garantias','AST-PGR':'Atrasos em orçamentos','AST-RC':'Reclamações da assistência',
  'MIC-EPA':'Atrasos em microscopia','MIC-GO':'Prazo de orçamento','MIC-RC':'Reclamações de Microscopia','DIR-FAT':'Despesas / faturamento','RH-TRE':'Treinamentos','ENG-RC':'Engenharia','NAC-RC':'Nacionalização','OUT-RC':'Outras reclamações',
  'ELE-RC':'Eletrônica','USI-RC':'Usinagem','AJU-RC':'Ajustagem','FUN-RC':'Funilaria','PIN-RC':'Pintura','EST-RC':'Estufas','FOR-RC':'Fornos','REF-RC':'Refrigeração','CEN-RC':'Centrífugas','MON-RC':'Montagem geral','OSM-RC':'Osmose','CAP-RC':'Capelas','DES-RC':'Destiladores','MAN-RC':'Mantas','MES-RC':'Mesas e chapas','AGI-RC':'Agitadores','BAN-RC':'Banhos','CAM-RC':'Câmaras climáticas','DEI-RC':'Deionizadores','BOM-RC':'Bombas','FUL-FOT-RC':'Fulgor e fotômetros',
};
const $ = id => document.getElementById(id);
const el=(tag,text,className)=>{
  const element=document.createElement(tag);
  if (text!==undefined) element.textContent=text;
  if (className) element.className=className;
  return element;
};
const option=(value,name)=>new Option(name,value);
let template,data,workbook,preset=overview,series=0,month=0,selectedMonth=0,lastMonth=0,loading=false,makingBatch=false;
const selected=new Set();
const rotationInterval=12000;
let tvActive=false,tvTimer;
const raw=(row,m)=>data.rows[row]?.[m+1]??null;
const fmtNumber=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
const fmtPercentage=new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:2});
const fmtMoney=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const fmtCompact=new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1});

function summarize(metric,indices) {return aggregate(metric,indices,raw);}

function format(v,unit,short=false) {
  if (v===null) return 'Sem dados';
  if (unit==='percent') {
    if (v>0 && v<0.0001) return '<0,01%';
    return fmtPercentage.format(v);
  }
  if (unit==='money') return short&&Math.abs(v)>=1000?'R$ '+fmtCompact.format(v):fmtMoney.format(v);
  const number=short?fmtCompact.format(v):fmtNumber.format(v);
  return unit==='hours'?number+' h':number;
}

function monthName() {return full[month]+' de '+data.year;}
function latestMonth() {
  const indices=months.map((_,i)=>i).filter(i=>Object.values(data.rows).some(row=>row[i+1]!==null));
  return indices.at(-1)??0;
}
function updateMonthOptions() {
  $('month').replaceChildren(...full.map((name,i)=>option(i,name+' '+data.year)));
  $('month').value=selectedMonth;
}
function status(text) {
  $('feedback').textContent=text;
  $('feedback').hidden=!text;
}

function setPresetMenu(expanded) {
  $('presetMenu').setAttribute('aria-expanded',String(expanded));
  $('indicatorSidebar').hidden=!expanded;
  document.querySelector('.shell').classList.toggle('sidebar-collapsed',!expanded);
  const label=expanded?'Recolher menu':'Abrir menu';
  $('presetMenu').setAttribute('aria-label',label);
  $('presetMenu').title=label;
}

$('presetMenu').addEventListener('click',()=>{
  setPresetMenu($('presetMenu').getAttribute('aria-expanded')!=='true');
});

function navigation() {
  const groups=new Map();
  presets.forEach(([category,label],i)=>{
    if (!groups.has(category)) {
      const group=el('div',undefined,'group');
      group.dataset.sector=sectorTheme[category];
      group.append(el('p',category));
      groups.set(category,group);
    }
    const button=el('button',label,'preset');
    button.setAttribute('aria-pressed',String(i===preset));
    button.addEventListener('click',()=>{
      selectPreset(i);
    });
    groups.get(category).append(button);
  });
  const overviewButton=el('button','Visão geral','preset overview-nav');
  overviewButton.id='overviewTab';
  overviewButton.setAttribute('aria-pressed',String(preset===overview));
  overviewButton.addEventListener('click',()=>{
    selectPreset(overview);
  });
  $('presets').replaceChildren(overviewButton,...groups.values());
}

function selectPreset(index,metric=0) {
  $('settingsPanel').hidden=true;$('dashboard').hidden=false;
  if (index===preset && metric===series) {render();return;}
  preset=index;
  series=metric;
  for (const [j,node] of [...$('presets').querySelectorAll('button')].entries()) {
    node.setAttribute('aria-pressed',String(j-1===preset));
  }
  render();
}

function scheduleTVRotation() {
  clearTimeout(tvTimer);
  if (!tvActive || document.hidden) return;
  tvTimer=setTimeout(advanceTV,rotationInterval);
}

function advanceTV() {
  const current=tvSlides.findIndex(slide=>slide.panel===preset && slide.metric===series);
  const next=tvSlides[(current+1)%tvSlides.length];
  selectPreset(next.panel,next.metric);
  scheduleTVRotation();
}

function setTVMode(active) {
  tvActive=active;
  document.body.classList.toggle('only-tv',active);
  $('tv').setAttribute('aria-pressed',String(active));
  $('cards').setAttribute('aria-live',active?'off':'polite');
  $('overview').setAttribute('aria-live',active?'off':'polite');
  if (active) window.scrollTo({top:0,left:0,behavior:'instant'});
  render();
  $(active?'title':'tv').focus({preventScroll:true});
  scheduleTVRotation();
}

function overviewTrend(metric,type) {
  const values=months.map((_,i)=>i<=month?summarize(metric,[i]).value:null);
  const present=values.filter(Number.isFinite);
  if (!present.length || present.some(value=>value<0)) return null;

  const trend=el('span',undefined,'overview-trend overview-trend-'+type);
  trend.setAttribute('aria-hidden','true');
  const maximum=Math.max(...present);
  if (type==='line') {
    const position=value=>maximum?8+84*value/maximum:8;
    trend.append(chartLine(values,position));
    if (month>0 && values[month-1]!==null && values[month]!==null) {
      const latest=chartLine(values.map((value,i)=>i===month-1||i===month?value:null),position);
      latest.classList.add('overview-latest-segment');
      trend.append(latest);
    }
    values.forEach((value,i)=>{
      if (value===null) return;
      const isolated=(i===0||values[i-1]===null)&&(i===values.length-1||values[i+1]===null);
      if (!isolated && i!==month) return;
      const dot=el('i',undefined,i===month?'current':'');
      dot.style.left=(i+.5)/months.length*100+'%';
      dot.style.bottom=position(value)+'%';
      trend.append(dot);
    });
  } else {
    values.forEach((value,i)=>{
      const bar=el('i',undefined,value===null?'missing':i===month?'current':'');
      if (value!==null) bar.style.setProperty('--level',maximum?value/maximum:0);
      trend.append(bar);
    });
  }
  return trend;
}

function monthlyChange(indicator,category) {
 const current=summarize(indicator,[month]).value,previous=month>0?summarize(indicator,[month-1]).value:null;
 const closed=data.closedMonths||[];
 const eligible=month>0&&closed.includes(month)&&closed.includes(month-1);
 const result=compare(indicator,current,previous,eligible);
 const change=el('span',undefined,'overview-change');
 change.append(el('span',result.label.split(' · ')[0],'overview-change-value'),el('span',month>0?months[month-1]+' / '+months[month]:'Sem mês anterior no ano','overview-change-months'));
 change.setAttribute('aria-label',result.label);
 if($('period').value!=='month'){change.replaceChildren(el('span','Comparação disponível na visão mensal'));change.setAttribute('aria-label','Comparação disponível na visão mensal');result.outcome='neutral';}
 return {change,outcome:result.outcome};
}
function coverage(result){return result.value===null?'Sem dados válidos':result.expected===1?'Dado apurado':result.n+' de '+result.expected+' meses com dados válidos';}

function renderOverview(range) {
  document.body.removeAttribute('data-sector');
  $('title').textContent='Visão geral';
  $('overview').classList.toggle('overview-dense',overviewCards.length>6);
  $('overview').replaceChildren(...overviewCards.map(({sector,panel,metric,trend})=>{
    const indicator=presets[panel][3][metric];
    const {value}=summarize(indicator,range);
    const card=el('button',undefined,'overview-card');
    card.type='button';
    card.disabled=tvActive;
    card.dataset.sector=sectorTheme[sector];
    const number=el('strong',format(value,indicator.unit,indicator.unit==='money'),'overview-value');
    number.title=value===null?'Sem dados no período':format(value,indicator.unit);
    card.append(
      el('span',sector,'overview-sector'),
      el('span',indicator.name,'overview-label'),
      number,
    );
    const preview=overviewTrend(indicator,trend);
    if (preview) card.append(preview);
    const {change,outcome}=monthlyChange(indicator,sector);
    card.dataset.outcome=outcome;
    card.classList.toggle('monthly-value',range.length===1 && $('period').value==='month');
    if (value===null) card.append(el('span','Sem dados','overview-note'));
    else if ($('period').value==='month') card.append(change);
    card.addEventListener('click',()=>{
      selectPreset(panel,metric);
      $('title').focus();
    });
    return card;
  }));
}

let fitFrame;
function fitScreen(){
 cancelAnimationFrame(fitFrame);
 fitFrame=requestAnimationFrame(()=>{
  const top=document.querySelector('.top');
  const topHeight=top.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--top-height',topHeight+'px');
  const plot=$('plot');
  if($('dashboard').hidden||$('detailPlot').hidden)return;
  const viewport=window.visualViewport?.height||window.innerHeight;
  const mainStyle=getComputedStyle(document.querySelector('main'));
  const panelStyle=getComputedStyle($('detailPlot'));
  const note=$('plotNote').hidden?0:$('plotNote').getBoundingClientRect().height;
  const documentTop=plot.getBoundingClientRect().top+window.scrollY;
  const plotStyle=getComputedStyle(plot);
  const monthSpace=parseFloat(plotStyle.getPropertyValue('--monthSpace'))||32;
  const reserved=monthSpace+note+parseFloat(plotStyle.marginBottom)+
    parseFloat(panelStyle.paddingBottom)+parseFloat(mainStyle.paddingBottom)+4;
  // Preserve readable marks on small screens; use vertical scrolling rather than shrinking text.
  const height=Math.max(160,Math.floor(viewport-documentTop-reserved));
  plot.style.setProperty('--height',height+'px');
 });
}
const screenLayout=new ResizeObserver(fitScreen);
for(const node of [document.querySelector('.top'),document.querySelector('.page-head'),$('cards'),$('overview'),$('series'),$('entryPanel')])screenLayout.observe(node);
window.addEventListener('resize',fitScreen);
window.visualViewport?.addEventListener('resize',fitScreen);
document.fonts?.ready.then(fitScreen);

function render() {
  fitScreen();
  const period=$('period').value;
  const annual=period==='annual';
  const accumulated=period!=='month';
  month=annual?lastMonth:selectedMonth;
  $('month').disabled=annual;
  $('month').value=month;
  const end=annual?months.length:month+1;
  const range=accumulated?months.slice(0,end).map((_,i)=>i):[month];
  const label=annual?'Ano '+data.year+' · dados disponíveis':accumulated?'Jan–'+months[month]+' '+data.year:monthName();
  const showingOverview=preset===overview;
  $('dataState').hidden=false;
  $('dataState').textContent=data.source==='demo'?'Demonstração':data.closedMonths?.includes(month)?'Mês encerrado':'Mês em aberto';
  $('periodHeading').textContent=label;
  $('sector').hidden=showingOverview;
  $('overview').hidden=!showingOverview;
  $('cards').hidden=showingOverview;
  $('detailPlot').hidden=showingOverview;
  if (showingOverview) {
    chartLabels.disconnect();
    renderOverview(range);
    return;
  }
  const [category,,title,metrics]=presets[preset];
  document.body.dataset.sector=sectorTheme[category];
  $('title').textContent=title;
  $('sector').textContent=category;
  const visibleMetrics=metrics.length>4
    ? [metrics[series],...metrics.filter((_,i)=>i!==series).slice(0,2)]
    : metrics;
  $('cards').replaceChildren(...visibleMetrics.map(metric=>{
    const result=summarize(metric,range);
    const card=el('article',undefined,'card'+(metric===metrics[series]?' chart-metric':''));
    const {change,outcome}=monthlyChange(metric,category);
    card.dataset.outcome=outcome;
    card.classList.toggle('monthly-value',!accumulated);
    card.append(
      el('p',metric.name),
      el('strong',format(result.value,metric.unit,metric.unit==='money')),
      ...(result.expected>1||result.value===null?[el('small',coverage(result),'coverage')]:[]),change,
    );
    if (result.value!==null) card.title=label+' · '+format(result.value,metric.unit);
    return card;
  }));
  const metric=metrics[series];
  $('chartTitle').textContent=metric.name+' ('+metricDefinition(metric).unit+')';
  $('chartReading').hidden=!accumulated;
  $('plotTitleValue').textContent=format(summarize(metric,[month]).value,metric.unit,true);
  $('plotTitleMonth').textContent=months[month]+' '+data.year;
  $('series').replaceChildren(...metrics.map((item,i)=>{
    const button=el('button',item.name);
    button.setAttribute('aria-pressed',String(i===series));
    button.addEventListener('click',()=>{series=i;render();$('series').children[i].focus();});
    return button;
  }));
  const points=months.map((_,i)=>annual||i<=month?summarize(metric,[i]).value:null);
  const {outcome}=monthlyChange(metric,category);
  $('detailPlot').dataset.outcome=outcome;
  renderPlot(metric,points);
  const hasMissing=points.some(value=>value===null) && points.some(Number.isFinite);
  $('plotNote').hidden=!hasMissing;
  $('plotNote').textContent=hasMissing?'— Sem lançamento':'';
}

function chartScale(points,unit) {
  const min=Math.min(0,...points.filter(Number.isFinite));
  const max=Math.max(0,...points.filter(Number.isFinite));
  const fallback={percent:0.0025,count:1,hours:1,money:1};
  const target=(max-min)/4 || fallback[unit];
  const magnitude=10**Math.floor(Math.log10(target));
  const stepBase=[1,2,2.5,5,10].map(n=>n*magnitude).find(n=>n>=target);
  const step=unit==='count'?Math.max(1,Math.ceil(stepBase)):stepBase;
  const low=Math.floor(min/step+1e-10);
  const high=Math.max(low+1,Math.ceil(max/step-1e-10),max===min?4:0);
  const position=v=>100*(v/step-low)/(high-low);
  const ticks=Array.from({length:high-low+1},(_,i)=>+(step*(high-i)).toPrecision(10));
  return {ticks,position};
}

function chartLine(points,position) {
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 120 100');
  svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('aria-hidden','true');
  svg.classList.add('trend-line');
  let path='';
  points.forEach((value,i)=>{
    if (value===null) return;
    const action=i>0&&points[i-1]!==null?'L':'M';
    path+=action+(i*10+5)+' '+(100-position(value))+' ';
  });
  const stroke=document.createElementNS(ns,'path');
  stroke.setAttribute('d',path);
  stroke.setAttribute('vector-effect','non-scaling-stroke');
  svg.append(stroke);
  return svg;
}

const chartLabels=new ResizeObserver(entries=>{
  for (const {target:bars} of entries) {
    const chartWidth=bars.clientWidth;
    if (!chartWidth) continue;
    const placed=[];
    for (const label of bars.querySelectorAll('.chart-label')) {
      const track=label.parentElement;
      const slot=track.parentElement;
      const width=label.offsetWidth;
      const height=label.offsetHeight;
      const center=slot.offsetLeft+slot.offsetWidth/2;
      const left=Math.max(0,Math.min(center-width/2,chartWidth-width));
      const right=left+width;
      const point=parseFloat(track.style.getPropertyValue('--point'));
      const naturalBottom=track.clientHeight*(1-point/100)-9;
      let bottom=naturalBottom;

      for (const other of placed.sort((a,b)=>b.bottom-a.bottom)) {
        if (left<other.right+3 && right>other.left-3 &&
            bottom>other.top-3 && bottom-height<other.bottom+3) {
          bottom=other.top-3;
        }
      }
      placed.push({left,right,top:bottom-height,bottom});
      label.style.setProperty('--label-shift',left+width/2-center+'px');
      label.style.setProperty('--label-lift',naturalBottom-bottom+'px');
    }
  }
});

function renderPlot(metric,points) {
  const chart=$('plot');
  chartLabels.disconnect();
  const hasData=points.some(Number.isFinite);
  chart.classList.toggle('has-chart-labels',hasData);
  if (!hasData) {
    chart.replaceChildren(el('p','Sem lançamentos neste indicador em '+data.year+'.','emptyPlot'));
    return;
  }
  const {ticks,position}=chartScale(points,metric.unit);
  const zero=position(0);
  const isRate=metric.unit==='percent';
  const axis=el('div',undefined,'axis');
  axis.setAttribute('aria-hidden','true');
  const grid=el('div',undefined,'gridlines');
  ticks.forEach(value=>{
    axis.append(el('span',format(value,metric.unit,true)));
    const rule=el('i');
    if (value===0) rule.classList.add('baseline');
    grid.append(rule);
  });
  const bars=el('div',undefined,'bars');
  bars.style.setProperty('--baseline',zero+'%');
  bars.append(grid);
  if (isRate) {
    bars.append(chartLine(points,position));
    if (month>0 && points[month-1]!==null && points[month]!==null) {
      const segment=chartLine(points.map((value,i)=>i===month-1||i===month?value:null),position);
      segment.classList.add('current-segment');
      bars.append(segment);
    }
  }
  points.forEach((value,i)=>{
    const slot=el('button',undefined,'slot'+(i===month?' selected':'')+(value===null?' empty':''));
    const description=value===null?'Sem dado':format(value,metric.unit);
    slot.type='button';
    slot.setAttribute('aria-label',full[i]+', '+description);
    slot.setAttribute('aria-pressed',String(i===month));

    const track=el('span',undefined,'track');
    const point=position(value??0);
    track.style.setProperty('--point',point+'%');
    track.style.setProperty('--base',Math.min(zero,point)+'%');
    track.style.setProperty('--size',Math.abs(point-zero)+'%');
    if (value!==null) {
      track.append(el('span',undefined,isRate?'dot':'bar'+(value===0?' at-zero':'')));
      const label=el('span',format(value,metric.unit,metric.unit==='money'),'chart-label');
      label.setAttribute('aria-hidden','true');
      track.append(label);
    }
    if (value===null) {
      const missing=el('span','—','missing-mark');
      missing.setAttribute('aria-hidden','true');
      track.append(missing);
    }
    slot.append(track,el('span',months[i],'month-label'),el('span',months[i]+' · '+description,'tip'));
    if (tvActive || $('month').disabled) {
      slot.setAttribute('aria-disabled','true');
      slot.tabIndex=-1;
    }
    else slot.addEventListener('click',()=>{
      selectedMonth=i;
      render();
      $('plot').querySelectorAll('button')[i]?.focus();
    });
    bars.append(slot);
  });
  chart.replaceChildren(axis,bars);
  chartLabels.observe(bars);
  fitScreen();
}

function printReports() {
  if($('printSource').value==='site')return presets.map(([sector,label],i)=>({name:'panel:'+i,sector,label})).filter(r=>$('printGroup').value==='Todos'||r.sector===$('printGroup').value);
  const active=workbook?.sheets.filter(s=>s.visible&&s.kind==='worksheet').map(s=>s.name);
  const group=$('printGroup').value;
  const entries=Object.entries(reportGroups).flatMap(([sector,names])=>names.map(name=>({name,sector})));
  if (active) {
    const used=new Set(entries.map(({name})=>name));
    const helpers=new Set(['Base','Metas','Base MPM','MACRO','Plan1','Plan1 (2)','Painel de Indicadores']);
    entries.push(...active.filter(name=>!used.has(name)&&!helpers.has(name)).map(name=>({name,sector:'Demais setores'})));
  }
  return entries.filter(p=>(group==='Todos'||p.sector===group)&&(!active||active.includes(p.name)));
}

function printCounts() {
  $('printCount').textContent=selected.size===1?'1 relatório selecionado':selected.size+' relatórios selecionados';
  const site=$('printSource').value==='site';
  document.querySelector('#printDialog .dialog-body > p.note:not(#printScope)').hidden=site;
  $('download').disabled=(!site&&!workbook)||!selected.size||makingBatch||loading;
  $('download').textContent=site?'Imprimir relatórios':'Baixar lote';
  $('printUpload').hidden=site;
  $('printScope').textContent=site?'Fonte: '+(data?.source==='demo'?'Demonstração (valores fictícios)':'Dados reais')+' · '+(data?.year||'')+'. Os relatórios usam os mesmos cálculos dos gráficos.':'A planilha externa mantém seus próprios valores; não recebe os lançamentos do site.';
  $('printUpload').textContent=workbook?'Trocar arquivo':'Selecionar arquivo';
}

function buildPrintList() {
  $('printList').replaceChildren(...printReports().map(({name,sector,label:reportLabel})=>{
    const label=el('label',undefined,'print-item');
    const check=el('input');
    check.type='checkbox';
    check.checked=selected.has(name);
    check.addEventListener('change',()=>{
      if(check.checked) selected.add(name);
      else selected.delete(name);
      printCounts();
    });
    const title=el('span',reportLabel??reportLabels[name]??name);
    title.append(el('small',sector));
    label.append(check,title);
    return label;
  }));
  printCounts();
}

async function readFile(file) {
  if (!file || loading || makingBatch || !template) return;
  loading=true;
  printCounts();
  $('printStatus').textContent='Lendo planilha…';
  try {
    workbook=await openWorkbook(file,template);
    for (const name of selected) {
      if (!workbook.sheets.some(s=>s.name===name&&s.visible&&s.kind==='worksheet')) selected.delete(name);
    }
    $('printStatus').textContent='';
  } catch(err) {
    $('printStatus').textContent=err.message;
  } finally {
    loading=false;
    buildPrintList();
  }
}

$('printUpload').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',e=>{
  const [file]=e.target.files;
  e.target.value='';
  readFile(file);
});
$('tv').addEventListener('click',async()=>{
  if (!data || tvActive) return;
  setTVMode(true);
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    // Escape still exits presentation mode if the browser declines fullscreen.
  }
});
document.addEventListener('keydown',event=>{
  if (event.key!=='Escape' || !tvActive) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  setTVMode(false);
});
document.addEventListener('fullscreenchange',()=>{
  if (!document.fullscreenElement && tvActive) setTVMode(false);
});
document.addEventListener('visibilitychange',scheduleTVRotation);
$('printSource').onchange=()=>{selected.clear();buildPrintList();};
$('printGroup').append(...['Todos',...new Set([...Object.keys(reportGroups),'Qualidade'])].map(n=>option(n,n)));
$('printGroup').addEventListener('change',buildPrintList);
$('selectGroup').addEventListener('click',()=>{for(const {name} of printReports()) selected.add(name);buildPrintList();});
$('clearPrint').addEventListener('click',()=>{selected.clear();buildPrintList();});
$('download').addEventListener('click',async()=>{
 if($('printSource').value==='site'){
 const area=$('printArea');area.replaceChildren();
 const period=$('period').value,range=period==='month'?[month]:Array.from({length:period==='annual'?12:month+1},(_,i)=>i);
 for(const name of selected){if(!name.startsWith('panel:'))continue;const [sector,,title,metrics]=presets[Number(name.slice(6))];
 const page=el('article',undefined,'print-page');page.append(el('h1',sector+' — '+title),el('p',(data.source==='demo'?'DEMONSTRAÇÃO · Dados fictícios':'Dados reais')+' · '+$('periodHeading').textContent));
 const table=el('table'),head=el('tr');head.append(el('th','Mês'),...metrics.map(m=>el('th',m.name+' ('+metricDefinition(m).unit+')')));table.append(head);
 for(const i of range){const row=el('tr');row.append(el('th',full[i]+(data.closedMonths.includes(i)?' · encerrado':' · em aberto')),...metrics.map(m=>el('td',format(summarize(m,[i]).value,m.unit))));table.append(row);}
 if(range.length>1){const row=el('tr');row.append(el('th','Acumulado disponível'),...metrics.map(m=>el('td',format(summarize(m,range).value,m.unit)+'; '+coverage(summarize(m,range)))));table.append(row);}
 page.append(table);for(const m of metrics){const rowName=id=>template.rows[id]?.[0]||id;page.append(el('p',m.name+': '+(m.den?rowName(m.row)+' ÷ '+rowName(m.den)+' × 100':metricDefinition(m).formula)+'. Meta não definida.'));}area.append(page);
 }
 window.print();return;
 }

  makingBatch=true;
  printCounts();
  $('printStatus').textContent='Preparando cópia para impressão…';
  try {
    const file=await batchWorkbook(workbook,new Set(selected));
    const url=URL.createObjectURL(file);
    const a=el('a');
    a.href=url;
    a.download=workbook.name.replace(/(\.(?:xlsm|xlsx))$/i,'_lote$1');
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    $('printStatus').textContent='Lote pronto. No Excel, abra a cópia e use Ctrl+P.';
  } catch(err) {
    $('printStatus').textContent=err.message;
  } finally {
    makingBatch=false;
    printCounts();
  }
});

try {
  const response=await fetch('./demonstracao.json');
  if (!response.ok) throw new Error();
  template=await response.json();
  data={...template,source:'demo',closedMonths:Array.from({length:12},(_,i)=>i).filter(i=>Object.values(template.rows).some(row=>Number.isFinite(row[i+1])))};
  const preferredYear=Number(localStorage.getItem('kpi-view-year'))||template.year;
  if(!$('period').options.length)$('period').append(option('month','Mês'),option('annual','Ano inteiro'),option('through-month','Até o mês selecionado'));
  function applyRecords(doc){
    data={year:doc.year,rows:{},source:'real',closedMonths:Object.entries(doc.months).filter(([,r])=>r.status==='closed').map(([m])=>Number(m))};
    for(const [id,row] of Object.entries(template.rows))data.rows[id]=[row[0],...Array(12).fill(null)];
    for(const [m,record]of Object.entries(doc.months)){
      for(const [id,v]of Object.entries(record.values))if(data.rows[id])data.rows[id][Number(m)+1]=v;
      const ids=[42,43,44,45,46,47,48],vals=ids.map(id=>record.values[id]);
      data.rows[84][Number(m)+1]=vals.every(v=>Number.isFinite(v))?vals.reduce((a,b)=>a+b,0):null;
    }
    localStorage.setItem('kpi-view-year',doc.year);selectedMonth=lastMonth=latestMonth();updateMonthOptions();render();
  }
  setupSettings({presets,defaults:defaultOverviewCards.map(c=>c.panel+':'+c.metric),recommend:recommendedTrend,apply:(keys,types)=>{
    overviewCards=keys.map(key=>{const[panel,metric]=key.split(':').map(Number);return {sector:presets[panel][0],panel,metric,trend:['line','bars'].includes(types[key])?types[key]:recommendedTrend(key)};});
    if(data&&$('period').options.length)render();
  },showOverview:()=>selectPreset(overview)});
  setupEntry({apply:applyRecords});
  try{const r=await fetch('/api/data?year='+preferredYear);if(!r.ok)throw Error();const saved=await r.json();if(Object.keys(saved.months).length)applyRecords(saved);}catch{status('Não foi possível consultar os lançamentos salvos. Exibindo demonstração.');}

  selectedMonth=lastMonth=latestMonth();
  const accumulation=el('optgroup');
  accumulation.label='Acumulado';
  accumulation.append(option('annual','Ano inteiro'),option('through-month','Até o mês selecionado'));
  $('period').replaceChildren(option('month','Mês'),accumulation);
  $('period').addEventListener('change',render);
  $('month').addEventListener('change',e=>{selectedMonth=Number(e.target.value);render();});
  updateMonthOptions();
  navigation();
  render();
} catch (error) {
  console.error('Falha ao iniciar o painel',error);
  status('Não foi possível carregar a Base inicial. Recarregue a página.');
}
