const count=(name,row)=>({name,row,unit:'count'});
const money=(name,row)=>({name,row,unit:'money'});
const rate=(name,row,den)=>({name,row,den,unit:'percent'});
export const presets=[
  ['Vendas','Entregas e atrasos','Atrasos na entrega',[rate('Taxa de atraso',5,21),count('Entregas realizadas',21),count('Entregas atrasadas',5)]],
  ['Vendas','Faturamento','Faturamento mensal',[money('Faturamento',3),count('Pedidos emitidos',24),count('Equipamentos entregues',21)]],
  ['Vendas','Devoluções','Devoluções comerciais',[rate('Devoluções / faturamento',26,3),money('Valor devolvido',26),count('Devoluções',25)]],
  ['Compras','Pedidos e atrasos','Pedidos em atraso',[rate('Taxa de atraso',6,4),count('Pedidos emitidos',4),count('Pedidos em atraso',6)]],
  ['Compras','Qualidade dos lotes','Qualidade dos lotes',[rate('Taxa de lotes não conformes',14,15),count('Lotes recebidos',15),count('Lotes não conformes',14)]],
  ['Produção','Volume produzido','Produção de equipamentos',[count('Equipamentos produzidos',9),count('Ordens de produção',11),count('Reclamações da produção',42)]],
  ['Produção','Máquinas paradas','Máquinas paradas',[rate('Paradas / horas trabalhadas',13,12),{name:'Horas paradas',row:13,unit:'hours'}, {name:'Horas trabalhadas',row:12,unit:'hours'}]],
  ['Produção','Devoluções','Devoluções da produção',[rate('Devoluções / faturamento',8,3),money('Valor devolvido',8),count('Devoluções',7)]],
  ['Qualidade','Reclamações e NNC','Reclamações e não conformidades',[count('Reclamações dos setores',84),count('Não conformidades',115),count('RCs da produção',42)]],
  ['Qualidade','RCs por setor','Reclamações por setor',[count('Produção',42),count('Assistência técnica',43),count('Compras',45),count('Vendas',46),count('Engenharia',44),count('Nacionalização',47),count('Microscopia',48)]],
  ['Assistência técnica','Envios e atrasos','Atrasos da assistência técnica',[rate('Taxa de atraso',31,29),count('Equipamentos enviados',29),count('Envios após o prazo',31)]],
  ['Assistência técnica','Garantias','Aparelhos em garantia',[rate('Em garantia / enviados',30,29),count('Aparelhos em garantia',30),count('Equipamentos enviados',29)]],
  ['Assistência técnica','Orçamentos','Atraso em orçamentos',[rate('Taxa de atraso',28,27),count('Orçamentos abertos',27),count('Orçamentos em atraso',28)]],
  ['Microscopia','Envios e atrasos','Atrasos em microscopia',[rate('Taxa de atraso',36,35),count('Equipamentos enviados',35),count('Envios após o prazo',36),count('Microscópios vendidos',32)]],
];
