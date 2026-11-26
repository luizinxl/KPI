# Indicadores da Fábrica

Painel de consulta mensal e apresentação para a equipe da fábrica. A visão geral prioriza volume produzido, reclamações e atrasos na seleção padrão. O primeiro indicador da seleção recebe o destaque de leitura, inclusive em seleções personalizadas.

## Identidade e hierarquia

- A fonte de verdade dos tokens é `public/style.css`. Fundo grafite (`--bg`), superfícies em carvão (`--surface`) e texto claro (`--text`) estruturam a página. Cobre (`--accent`) realça o indicador principal na visão geral.
- A interface usa fonte nativa do sistema e números tabulares. Valores e unidades aparecem juntos. Gráficos compactos ficam abaixo da leitura principal.
- Verde e vermelho representam melhora e piora conforme a regra de cada métrica. As setas informam a direção numérica. O texto informa quando a direção de desempenho é indefinida.
- A visão geral no desktop usa um cartão principal vertical com a seleção de seis indicadores. Na TV, a grade se centraliza no espaço disponível e a composição prioriza legibilidade à distância. Os painéis detalhados usam o mesmo acabamento de cartões e gráficos.
- A revisão de lançamentos usa o diálogo nativo do formulário e as mesmas fórmulas e formatação da consulta. O fluxo e os estados estão descritos em [Uso e interface](docs/interface.md).
