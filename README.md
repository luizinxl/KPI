# Indicadores da Fábrica

Painel de indicadores mensais para consulta, apresentação em TV e impressão. O lançamento pelo site usa 33 campos de seis setores e alimenta os gráficos após a gravação.

| Documento | Conteúdo |
| --- | --- |
| [Uso e interface](docs/interface.md) | Visão geral, painéis, modo TV, lançamento, configurações e impressão |
| [Dados e indicadores](docs/dados.md) | Mapeamento das linhas da planilha, fórmulas, unidades, direção e comparações |
| [Arquitetura e operação](docs/operacao.md) | Módulos, API, R2, acesso, histórico, build e verificação |

## Desenvolvimento local

Use Node.js 22 ou mais recente. O projeto usa módulos JavaScript e a biblioteca padrão do Node para o build e os testes.

```sh
npm run build
npm test
node scripts/test-metrics.mjs
PORT=3000 npm run dev
```

Abra [localhost:3000](http://localhost:3000). A prévia usa armazenamento simulado para leitura e abre com dados fictícios. Os testes do Worker exercitam a gravação com um R2 em memória.
