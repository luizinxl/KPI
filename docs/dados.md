# Dados e indicadores

O cadastro de entrada em `public/fields.js` usa como identificador a linha da guia Base do modelo Excel. O catálogo de gráficos fica em `public/catalogue.js`, a agregação em `public/metrics.js` e a linha calculada de reclamações em `applyRecords`, em `public/app.js`.

## Entrada e validação

- O formulário aceita anos de 2020 a 2100. Os meses no armazenamento são indexados de 0 (janeiro) a 11 (dezembro).
- A entrada usa vírgula decimal e aceita ponto de milhar. Contagens são inteiras, valores monetários têm precisão de centavos e horas decimais são convertidas para minutos inteiros por arredondamento. O formulário aceita entradas de até 1 trilhão antes da conversão. A API valida os valores já normalizados.
- Campo vazio é `null`. Zero indica que o resultado foi apurado e vale zero. A validação exige as 33 chaves, inclusive as preenchidas com `null` em rascunhos.
- As linhas abaixo têm limite vinculado ao total, quando os dois campos foram informados. O primeiro valor de cada par deve ser menor ou igual ao segundo: 5/21, 6/4, 14/15, 28/27, 30/29, 31/29 e 36/35.
- O fechamento exige todos os campos preenchidos e mês já terminado no fuso `America/Sao_Paulo`. Registros legados sem situação são tratados como em aberto.
- A linha 84 é a soma das linhas 42 a 48 do mesmo mês. Só é calculada quando as sete linhas têm valor.

## Cálculo e comparação

| Unidade | Mensal e acumulado |
| --- | --- |
| Quantidade | Soma dos valores disponíveis |
| Reais | Soma dos valores disponíveis |
| Horas | Soma dos minutos disponíveis dividida por 60 |
| Percentual | Soma dos numeradores dividida pela soma dos denominadores dos mesmos meses válidos. A formatação em percentual multiplica a razão por 100. |

A taxa só usa pares com numerador finito e denominador positivo. Se nenhum mês contribuir, o resultado é exibido como **Sem dados**. O acumulado até o mês selecionado usa janeiro até esse mês. O ano inteiro considera janeiro a dezembro. Os dois podem incluir lançamentos em aberto e informam a cobertura.

A comparação mensal exige dois meses consecutivos encerrados do mesmo ano com valores válidos. Janeiro fica sem comparação. Na demonstração, meses com valores fictícios são tratados como encerrados para ilustrar a comparação. A interface mostra, por exemplo, **10% → 12%**. Melhora e piora seguem a direção da métrica. Empate e direção indefinida são neutros. As metas empresariais ficam indefinidas no catálogo atual.

A relação **Paradas / horas trabalhadas** usa a linha 13 dividida pela 12. Ela expressa horas paradas em relação às horas trabalhadas. **Devoluções / faturamento** usa o valor devolvido em reais dividido pelo faturamento.

## Linhas recebidas no formulário

| Setor | Linha | Campo | Unidade na entrada |
| --- | ---: | --- | --- |
| Vendas | 3 | Faturamento | R$ |
| Vendas | 24 | Pedidos emitidos | quantidade |
| Vendas | 21 | Entregas realizadas | quantidade |
| Vendas | 5 | Entregas atrasadas | quantidade |
| Vendas | 25 | Devoluções | quantidade |
| Vendas | 26 | Valor devolvido | R$ |
| Compras | 4 | Pedidos emitidos | quantidade |
| Compras | 6 | Pedidos em atraso | quantidade |
| Compras | 15 | Lotes recebidos | quantidade |
| Compras | 14 | Lotes não conformes | quantidade |
| Produção | 9 | Equipamentos produzidos | quantidade |
| Produção | 11 | Ordens de produção | quantidade |
| Produção | 12 | Horas trabalhadas | h |
| Produção | 13 | Horas paradas | h |
| Produção | 7 | Devoluções | quantidade |
| Produção | 8 | Valor devolvido | R$ |
| Qualidade | 115 | Não conformidades | quantidade |
| Qualidade | 42 | Reclamações da produção | quantidade |
| Qualidade | 43 | Reclamações da assistência | quantidade |
| Qualidade | 44 | Reclamações da engenharia | quantidade |
| Qualidade | 45 | Reclamações de compras | quantidade |
| Qualidade | 46 | Reclamações de vendas | quantidade |
| Qualidade | 47 | Reclamações da nacionalização | quantidade |
| Qualidade | 48 | Reclamações de microscopia | quantidade |
| Assistência técnica | 27 | Orçamentos abertos | quantidade |
| Assistência técnica | 28 | Orçamentos em atraso | quantidade |
| Assistência técnica | 29 | Equipamentos enviados | quantidade |
| Assistência técnica | 30 | Aparelhos em garantia | quantidade |
| Assistência técnica | 31 | Envios após o prazo | quantidade |
| Microscopia | 32 | Microscópios vendidos | quantidade |
| Microscopia | 35 | Equipamentos enviados | quantidade |
| Microscopia | 36 | Envios após o prazo | quantidade |

## Catálogo de séries

Os identificadores persistidos em Configurações usam o formato `painel:série`, com ambos os índices começando em zero. Uma mudança na ordem do catálogo exige revisar as chaves já gravadas.

| ID | Setor e painel | Série | Linhas | Unidade | Direção |
| --- | --- | --- | --- | --- | --- |
| 0:0 | Vendas · Entregas e atrasos | Taxa de atraso | 5 ÷ 21 | % | Menor é melhor |
| 0:1 | Vendas · Entregas e atrasos | Entregas realizadas | 21 | unidades | Maior é melhor |
| 0:2 | Vendas · Entregas e atrasos | Entregas atrasadas | 5 | unidades | Menor é melhor |
| 1:0 | Vendas · Faturamento | Faturamento | 3 | R$ | Maior é melhor |
| 1:1 | Vendas · Faturamento | Pedidos emitidos | 24 | unidades | Maior é melhor |
| 1:2 | Vendas · Faturamento | Equipamentos entregues | 21 | unidades | Maior é melhor |
| 2:0 | Vendas · Devoluções | Devoluções / faturamento | 26 ÷ 3 | % | Menor é melhor |
| 2:1 | Vendas · Devoluções | Valor devolvido | 26 | R$ | Menor é melhor |
| 2:2 | Vendas · Devoluções | Devoluções | 25 | unidades | Menor é melhor |
| 3:0 | Compras · Pedidos e atrasos | Taxa de atraso | 6 ÷ 4 | % | Menor é melhor |
| 3:1 | Compras · Pedidos e atrasos | Pedidos emitidos | 4 | unidades | Acompanhar sem classificação |
| 3:2 | Compras · Pedidos e atrasos | Pedidos em atraso | 6 | unidades | Menor é melhor |
| 4:0 | Compras · Qualidade dos lotes | Taxa de lotes não conformes | 14 ÷ 15 | % | Menor é melhor |
| 4:1 | Compras · Qualidade dos lotes | Lotes recebidos | 15 | unidades | Acompanhar sem classificação |
| 4:2 | Compras · Qualidade dos lotes | Lotes não conformes | 14 | unidades | Menor é melhor |
| 5:0 | Produção · Volume produzido | Equipamentos produzidos | 9 | unidades | Maior é melhor |
| 5:1 | Produção · Volume produzido | Ordens de produção | 11 | unidades | Acompanhar sem classificação |
| 5:2 | Produção · Volume produzido | Reclamações da produção | 42 | unidades | Menor é melhor |
| 6:0 | Produção · Máquinas paradas | Paradas / horas trabalhadas | 13 ÷ 12 | % | Menor é melhor |
| 6:1 | Produção · Máquinas paradas | Horas paradas | 13 | horas | Menor é melhor |
| 6:2 | Produção · Máquinas paradas | Horas trabalhadas | 12 | horas | Acompanhar sem classificação |
| 7:0 | Produção · Devoluções | Devoluções / faturamento | 8 ÷ 3 | % | Menor é melhor |
| 7:1 | Produção · Devoluções | Valor devolvido | 8 | R$ | Menor é melhor |
| 7:2 | Produção · Devoluções | Devoluções | 7 | unidades | Menor é melhor |
| 8:0 | Qualidade · Reclamações e NNC | Reclamações dos setores | 84 | unidades | Menor é melhor |
| 8:1 | Qualidade · Reclamações e NNC | Não conformidades | 115 | unidades | Menor é melhor |
| 8:2 | Qualidade · Reclamações e NNC | RCs da produção | 42 | unidades | Menor é melhor |
| 9:0 | Qualidade · RCs por setor | Produção | 42 | unidades | Menor é melhor |
| 9:1 | Qualidade · RCs por setor | Assistência técnica | 43 | unidades | Menor é melhor |
| 9:2 | Qualidade · RCs por setor | Compras | 45 | unidades | Menor é melhor |
| 9:3 | Qualidade · RCs por setor | Vendas | 46 | unidades | Menor é melhor |
| 9:4 | Qualidade · RCs por setor | Engenharia | 44 | unidades | Menor é melhor |
| 9:5 | Qualidade · RCs por setor | Nacionalização | 47 | unidades | Menor é melhor |
| 9:6 | Qualidade · RCs por setor | Microscopia | 48 | unidades | Menor é melhor |
| 10:0 | Assistência técnica · Envios e atrasos | Taxa de atraso | 31 ÷ 29 | % | Menor é melhor |
| 10:1 | Assistência técnica · Envios e atrasos | Equipamentos enviados | 29 | unidades | Maior é melhor |
| 10:2 | Assistência técnica · Envios e atrasos | Envios após o prazo | 31 | unidades | Menor é melhor |
| 11:0 | Assistência técnica · Garantias | Em garantia / enviados | 30 ÷ 29 | % | Acompanhar sem classificação |
| 11:1 | Assistência técnica · Garantias | Aparelhos em garantia | 30 | unidades | Acompanhar sem classificação |
| 11:2 | Assistência técnica · Garantias | Equipamentos enviados | 29 | unidades | Maior é melhor |
| 12:0 | Assistência técnica · Orçamentos | Taxa de atraso | 28 ÷ 27 | % | Menor é melhor |
| 12:1 | Assistência técnica · Orçamentos | Orçamentos abertos | 27 | unidades | Acompanhar sem classificação |
| 12:2 | Assistência técnica · Orçamentos | Orçamentos em atraso | 28 | unidades | Menor é melhor |
| 13:0 | Microscopia · Envios e atrasos | Taxa de atraso | 36 ÷ 35 | % | Menor é melhor |
| 13:1 | Microscopia · Envios e atrasos | Equipamentos enviados | 35 | unidades | Maior é melhor |
| 13:2 | Microscopia · Envios e atrasos | Envios após o prazo | 36 | unidades | Menor é melhor |
| 13:3 | Microscopia · Envios e atrasos | Microscópios vendidos | 32 | unidades | Maior é melhor |
