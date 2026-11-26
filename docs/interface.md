# Uso e interface

## Consulta e modo TV

- **Visão geral.** Selecione o mês, o acumulado até o mês ou o ano inteiro. Os cartões mostram a unidade, a cobertura e a tendência. Os seis gráficos iniciais são equipamentos produzidos, reclamações dos setores, atraso de compras, faturamento, atraso da assistência e relação de horas paradas com horas trabalhadas. O primeiro recebe destaque. O menu lateral abre e recolhe pelo botão no cabeçalho.
- **Painéis detalhados.** Abra o seletor de indicadores e escolha um painel por setor. Use os botões de série para mudar a métrica do gráfico. Microscopia permanece disponível nesse seletor e em Configurações. A lista de guias do Excel também pode incluir relatórios de RH.
- **Fonte.** Use Real ou Demonstração. Na abertura, o painel tenta buscar o ano de consulta anterior, salvo neste navegador, ou 2027. Se o ano tiver lançamentos, abre os dados reais. Um ano real vazio pode ser consultado selecionando Real e atualizando.
- **Modo TV.** A apresentação tenta abrir em tela cheia e alterna entre visão geral e séries a cada 12 segundos. A rotação pausa quando a página fica oculta. Esc encerra a apresentação.

## Configurações

Marque de 1 a 12 gráficos e salve com o PIN ou com a sessão ativa. A seleção é compartilhada no site e aplicada à visão geral também durante o modo TV. Clique em **Restaurar seleção padrão** e salve para confirmar a restauração. Em caso de conflito, reabra Configurações para consultar a seleção atual antes de editar de novo.

## Lançamento mensal

1. Abra **Inserir dados**, informe o PIN e escolha ano e mês.
2. Preencha os valores brutos por setor. Digite horas decimais, valores monetários ou quantidades conforme o rótulo. Deixe em branco o que ainda estiver pendente.
3. Revise os números antes de salvar. A prévia identifica o setor e painel de cada série que muda e mostra o valor salvo e o novo valor com a unidade do gráfico. Os valores brutos podem ser conferidos no mesmo diálogo. Use o estado em aberto enquanto houver pendências. Para encerrar um mês passado, apure todos os 33 campos.
4. Consulte o histórico do mês quando precisar recuperar uma versão. Confira os valores carregados e salve para registrá-los como nova versão.

Os formulários informam o estado da operação e pedem confirmação antes de descartar alterações pendentes. A sessão expira após 30 minutos.

## Decisões de UI e UX

A interface usa títulos com unidade, rótulos visíveis nos campos e comparação no formato anterior → atual. A seta indica a direção numérica. A cor e o texto indicam o resultado da comparação. Os gráficos detalhados usam o espaço disponível abaixo do cabeçalho e dos cartões, com altura mínima de 160 px. Em telas estreitas, os controles se reorganizam e a página permite rolagem vertical para preservar a leitura. A impressão usa estilos próprios.

O histórico de documentação do projeto registra as referências **dashboard-design** para hierarquia, seleção e legibilidade dos indicadores e **unslop-ui** para textos curtos, controles explícitos e revisão antes de salvar. A interface está em `public/index.html`, `public/style.css`, `public/app.js`, `public/entry.js` e `public/settings.js`.

O cabeçalho usa uma barra em pílula. A Visão Geral mostra tendências e a comparação do mês anterior → mês atual, com a unidade de cada indicador. A fonte é identificada no cabeçalho e os lançamentos salvos são carregados automaticamente quando disponíveis.
