export const groups={
'Vendas':[[3,'Faturamento','money'],[24,'Pedidos emitidos'],[21,'Entregas realizadas'],[5,'Entregas atrasadas'],[25,'Devoluções'],[26,'Valor devolvido','money']],
'Compras':[[4,'Pedidos emitidos'],[6,'Pedidos em atraso'],[15,'Lotes recebidos'],[14,'Lotes não conformes']],
'Produção':[[9,'Equipamentos produzidos'],[11,'Ordens de produção'],[12,'Horas trabalhadas','hours'],[13,'Horas paradas','hours'],[7,'Devoluções'],[8,'Valor devolvido','money']],
'Qualidade':[[115,'Não conformidades'],[42,'Reclamações da produção'],[43,'Reclamações da assistência'],[44,'Reclamações da engenharia'],[45,'Reclamações de compras'],[46,'Reclamações de vendas'],[47,'Reclamações da nacionalização'],[48,'Reclamações de microscopia']],
'Assistência técnica':[[27,'Orçamentos abertos'],[28,'Orçamentos em atraso'],[29,'Equipamentos enviados'],[30,'Aparelhos em garantia'],[31,'Envios após o prazo']],
'Microscopia':[[32,'Microscópios vendidos'],[35,'Equipamentos enviados'],[36,'Envios após o prazo']]
};
export const fields=Object.values(groups).flat();
export const pairs=[[5,21],[6,4],[14,15],[28,27],[30,29],[31,29],[36,35]];
export function parseValue(s,type){
 if(s.trim()==='')return null;
 if(!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(s.trim()))throw Error('Use números como 1250 ou 1.250,50.');
 const n=Number(s.trim().replaceAll('.','').replace(',','.'));
 if(!Number.isFinite(n)||n>1e12||n<0)throw Error('Informe um valor entre 0 e 1 trilhão.');
 if(!type&&!Number.isInteger(n))throw Error('Informe uma quantidade inteira.');
 if(type==='money'&&Math.abs(n*100-Math.round(n*100))>0.001)throw Error('Use até duas casas decimais.');
 return type==='hours'?Math.round(n*60):n;
}
export function validate(values){
 for(const [id,label,type]of fields){const n=values[id];if(n!==null&&(!Number.isFinite(n)||n<0||n>1e14||(!type&&!Number.isInteger(n))))throw Error(label+': valor inválido.');}
 for(const [id,label,type]of fields){const n=values[id];if(n!==null&&((type==='hours'&&!Number.isInteger(n))||(type==='money'&&Math.abs(n*100-Math.round(n*100))>0.001)))throw Error(label+': precisão inválida.');}
 for(const [a,b] of pairs)if(values[a]!==null&&values[b]!==null&&values[a]>values[b])throw Error(fields.find(f=>f[0]===a)[1]+' não pode superar '+fields.find(f=>f[0]===b)[1].toLowerCase()+'.');
}

export function validateClosure(values){validate(values);if(fields.some(([id])=>values[id]===null))throw Error('Para encerrar o mês, preencha todos os campos; use 0 somente para resultados apurados como zero.');}
