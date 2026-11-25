# Arquitetura e operação

## Organização do código

| Arquivo | Responsabilidade |
| --- | --- |
| `public/index.html`, `public/style.css` | Estrutura, navegação, layout responsivo e impressão |
| `public/app.js` | Consulta, conversão de registros em séries, renderização, comparação visual, modo TV e impressão |
| `public/catalogue.js`, `public/metrics.js` | Catálogo de painéis, agregação e direção das métricas |
| `public/fields.js`, `public/entry.js` | Esquema compartilhado, validação, revisão e histórico na tela |
| `public/settings.js` | Seleção, persistência e aplicação dos gráficos da visão geral |
| `public/workbook.js` | Leitura das partes ZIP/XML do Excel e preparação da cópia para impressão |
| `public/demonstracao.json` | Série fictícia e nomes das linhas usados pelo painel |
| `worker/index.js` | Arquivos estáticos, autenticação por PIN, API e acesso ao R2 |
| `.openai/hosting.json`, `scripts/build.mjs` | Configuração do Sites e geração do Worker ESM com arquivos públicos incorporados |
| `dist/server/index.js` | Worker gerado pelo build a partir dos arquivos fonte |

Os lançamentos passam pelo formulário, pela API do Worker e pelo R2. O painel transforma os registros do ano em séries mensais. A demonstração tem fonte própria. A leitura da planilha externa ocorre no navegador e serve ao lote de impressão.

Para aceitar um lote Excel, o leitor exige a guia `Base`, lê o ano em `B1` e mapeia janeiro a dezembro nas colunas `B:M`. Ele compara o rótulo na coluna A e aceita uma correspondência única normalizada quando a linha esperada mudou. O lote ajusta as guias selecionadas na cópia do arquivo. As células, fórmulas e demais partes do pacote são aproveitadas do Excel de origem.

## API e acesso

A audiência do site é administrada pelo Sites. Dentro do site, o PIN protege alterações de lançamentos e configurações. Configure `ENTRY_PIN` como segredo do Worker. O vínculo do R2 é `BUCKET`.

| Método e rota | Comportamento |
| --- | --- |
| `POST /api/login` | Valida o PIN e cria uma sessão de 30 minutos |
| `GET /api/session` | Informa se há sessão ativa |
| `POST /api/logout` | Remove a sessão e limpa o cookie |
| `GET /api/data?year=AAAA` | Lê os lançamentos e o histórico do ano, com a revisão atual |
| `PUT /api/data?year=AAAA` | Grava `month`, `values`, `status` e verifica `revision`. Exige sessão. |
| `GET /api/settings` | Lê a seleção e a revisão atuais |
| `PUT /api/settings` | Grava `overview` com 1 a 12 chaves distintas válidas e verifica `revision`. Exige sessão. |

O cookie `kpi_session` usa `HttpOnly`, `Secure` e `SameSite=Strict`. Métodos diferentes de GET passam por verificação de origem. As rotas de leitura da tabela usam o controle de acesso do site. Cinco erros de PIN dentro da janela de tentativas bloqueiam novas tentativas pelo restante da janela de 15 minutos. O contador por IP no R2 usa leitura e escrita separadas, o que limita sua precisão sob simultaneidade.

## Armazenamento e conflitos

| Objeto R2 | Conteúdo |
| --- | --- |
| `records/<ano>.json` | Ano, meses, valores, situação, timestamps e histórico por mês |
| `settings/overview.json` | Lista ordenada de séries da visão geral e timestamp |
| `sessions/<id>` | Expiração da sessão |
| `attempts/<hash-do-IP>` | Contagem e fim da janela de tentativas |

A revisão é o ETag do objeto. A primeira gravação usa revisão nula e criação condicional. As próximas verificam o ETag antes de gravar e usam condição no próprio R2. Uma revisão divergente resulta em HTTP 409. Reabra o registro ou as configurações para consultar a revisão mais recente antes de reaplicar a alteração.

Cada gravação mensal adiciona o estado anterior ao histórico no mesmo objeto e atualiza o mês na mesma operação condicional. Recuperar uma versão pela interface carrega os valores para revisão e cria uma nova gravação após confirmação. Cópias antigas no prefixo `history/` pertencem ao formato anterior. A tela lê o histórico dentro do registro anual.

## Build e verificação

O build produz `dist/server/index.js` e copia a configuração do Sites para `dist/.openai/hosting.json`. Para publicação de aplicação, use o projeto vinculado nessa configuração e um build da revisão correspondente. O repositório contém a configuração do Sites. A operação em Vercel não foi verificada nesta revisão.

| Verificação | Comando ou cenário |
| --- | --- |
| Empacotamento | `npm run build` |
| Worker e armazenamento simulado | `npm test` |
| Cálculo, dados ausentes e direção | `node scripts/test-metrics.mjs` |
| Navegação visual | `PORT=3000 npm run dev`, alternando períodos, séries, largura de tela e modo TV |
| Acesso e concorrência em ambiente com R2 | Verificar login, dois editores com a mesma revisão, histórico e gravação de Configurações |
| Impressão no Excel | Abrir um lote de teste no Excel e conferir as guias ativas em Ctrl+P |
