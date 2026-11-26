// Shared metric policy: no business targets or directions are inferred from volume alone.
export const lowerRows=new Set([5,6,7,8,13,14,25,26,28,31,36,42,43,44,45,46,47,48,84,115]);
export const higherRows=new Set([3,9,21,24,29,32,35]);
export function metricDefinition(metric){
 const unit={percent:'%',hours:'horas',money:'R$',count:'unidades'}[metric.unit];
 return {unit,formula:metric.den?`Total de ${metric.row} ÷ total de ${metric.den} × 100`:metric.unit==='hours'?'Total de minutos ÷ 60':'Soma dos valores informados',direction:lowerRows.has(metric.row)?'Menor é melhor':higherRows.has(metric.row)?'Maior é melhor':'Acompanhar sem classificação',target:null};
}
export function aggregate(metric,indices,read){
 let sum=0,denom=0,n=0;
 for(const i of indices){const v=read(metric.row,i),d=metric.den?read(metric.den,i):1;if(!Number.isFinite(v)||!Number.isFinite(d)||d<=0)continue;sum+=v;denom+=d;n++;}
 return {value:!n?null:metric.den?sum/denom:metric.unit==='hours'?sum/60:sum,n,expected:indices.length};
}
export function compare(metric,current,previous,eligible){
 if(!eligible||!Number.isFinite(current)||!Number.isFinite(previous))return {outcome:'neutral',label:'Sem comparação: meses não encerrados ou sem dados'};
 const delta=current-previous;
 const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
 const value=v=>metric.unit==='percent'?new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:2}).format(v):metric.unit==='money'?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2}).format(v):number.format(v)+(metric.unit==='hours'?' h':'');
 const label=value(previous)+' → '+value(current);
 const known=lowerRows.has(metric.row)||higherRows.has(metric.row);
 const favorable=lowerRows.has(metric.row)?delta<0:delta>0;
 return {direction:delta>0?'↑':delta<0?'↓':'→',outcome:!delta||!known?'neutral':favorable?'positive':'negative',label:label+' · '+(!delta?'sem alteração':!known?'avaliar contexto':favorable?'melhorou':'piorou')};
}

// The consolidated complaints row exists only when all seven source counts are known.
export function readMonthlyValue(values,row){
 if(row!==84)return values[row]??null;
 const counts=[42,43,44,45,46,47,48].map(id=>values[id]);
 return counts.every(Number.isFinite)?counts.reduce((sum,count)=>sum+count,0):null;
}
