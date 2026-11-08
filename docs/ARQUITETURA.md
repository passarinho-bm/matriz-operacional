# Arquitetura · Matriz Operacional

## Visão geral

```
Planilha do Google (CSV publicado)        Fase 2: SQL Server
        │                                        │
        ▼                                        ▼
 GoogleSheetDataSource  ──┐   ┌── SqlServerDataSource (futura)
                          ▼   ▼
                    MatrizDataSource  (interface)
                          │
                    MatrizService  (cache, falha por aba, resumo e frota)
                          │
                    MatrizController  /api/*   (somente leitura)
                          │
                  Front React (Vite) — 8 abas
```

- **Fase 1 (esta):** a fonte é a planilha do Google publicada em CSV. O sistema só lê.
- **Fase 2 (futura):** a fonte passa a ser o SQL Server. Troca-se só o provider em `server/app.module.ts`.
  O cálculo, a API e a tela não mudam.

## Pastas

| Pasta | Conteúdo |
|---|---|
| `server/` | API NestJS (porta 3001). `matriz/sheet/` guarda todo o código de CSV, `gid` e cabeçalho. |
| `shared/` | Tipos (`types.ts`) e regras de guarnição (`poder.ts`), usados pela API e pela tela. |
| `app/` | Front React + Vite (porta 3000 em desenvolvimento). `charts/` tem os gráficos D3. |
| `tests/` | Testes (`node --test`) e dados **fictícios** em `tests/fixtures/`. |
| `index.html`, `tools/` | Painel original (HTML único) e scripts do mapa. Continuam publicados no GitHub Pages. |

## Onde ficam as regras

- **Fórmulas da matriz** (efetivo necessário, saldos, Ralvo, risco, carga atualizada): vêm calculadas
  pela planilha (colunas das abas). O sistema lê e exibe. O módulo `server/matriz/calculo.ts` calcula só
  os agregados: soma por COMAR, GBMs com déficit, pior GBM pela carga e contagem de viaturas.
- **Passo a passo** das abas Matriz de risco e Carga operacional: a tela monta o texto com os valores da
  planilha e os pesos da aba Parâmetros. Nada fica fixo no código.
- **Poder operacional**: `shared/poder.ts` (GBM de 69 = 6 + 5 + 15 + 43; ASE 5 ou 4; AR de 2 a 4;
  2 ASE a partir de 8). Não depende da planilha.

## Contrato de dados (base do esquema SQL da Fase 2)

Cada método de `MatrizDataSource` devolve objetos tipados. Os tipos estão em `shared/types.ts`.

| Método | Tipo | Aba de origem | Observação |
|---|---|---|---|
| `lerAbsoluto()` | `AbsRow[]` | Absoluto | Uma linha por GBM. Viaturas guardam o modelo (texto). Rankings são inteiros. |
| `lerRisco()` | `RiscoRow[]` | Matriz de Risco | Valores medidos e pontos de cada critério. |
| `lerCarga()` | `CargaData` | Carga Operacional | `rows` por GBM, `total`, e 3 naturezas (APH, multiemprego, incêndio). |
| `lerParametros()` | `Params` | Parâmetros | Classes, pesos, limites do fator D, β, constantes de GSV e oficial de dia, matrizes de distância e de tempo. |

Chaves naturais: o **nome do GBM** liga as abas entre si. Na Fase 2, prefira um código de GBM estável
e guarde a competência (mês) em cada tabela.

## API (somente leitura)

| Rota | Resposta |
|---|---|
| `GET /api/health` | `{ status: "ok" }` |
| `GET /api/status` | Estado e data/hora da última leitura de cada aba. |
| `POST /api/recarregar` | Ignora o cache e lê de novo. Não altera a planilha. |
| `GET /api/matriz` | `{ rows, resumo[], frota[] }` |
| `GET /api/risco` · `/api/carga` · `/api/parametros` · `/api/distancias` | Dados da aba. |
| `GET /api/poder-operacional?total=69&n=10&c=auto` | Divisão do efetivo e guarnição da ala. |
| `GET /api/mapa` | Camadas do KMZ (`mapa.json`). |

Cada resposta de aba usa o envelope `{ status, msg?, atualizadoEm, obsoleto, data }`.
Se uma aba falha, só ela mostra erro. Se a leitura nova falha e há cache, a API devolve o cache com
`obsoleto: true` e a tela avisa «Dados de [data/hora]. Não foi possível atualizar.».

## Teste sem internet

`SHEET_LOCAL_DIR=./pasta` faz a API ler `t-absoluto.csv`, `t-risco.csv`, `t-carga.csv` e `t-params.csv`
dessa pasta. `tests/fixtures/` traz um conjunto fictício (`node tests/fixtures/gerar.mjs` gera de novo).
