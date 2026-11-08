# Matriz Operacional · CBMDF

Painel público da Matriz Operacional do CBMDF (Comando Operacional), sem login.

- Site: https://passarinho-bm.github.io/matriz-operacional/
- Publicação: GitHub Pages a partir do branch `main`. Cada push publica em 1 a 2 minutos.
- Responsável: Coronel Passarinho (CBMDF). Os textos do site são em português do Brasil.

## Regras do projeto

- **Não alterar a planilha do Google.** O site só lê os dados. Toda mudança é no site.
- Textos curtos e diretos, no estilo ASD-STE100: frases curtas, voz ativa, uma ideia por frase.
- Títulos e botões em caixa de frase («Matriz de risco», não «Matriz De Risco»).
- Cada painel tem um botão `i` (`.tip` com `data-tip`) que explica o dado. Na aba Matriz os tooltips explicam a coluna e **não** citam a fonte; nas outras abas o tooltip pode dizer a fonte.
- Visual BRADO, tema claro: tokens em `:root` (`--bar #4c5567`, `--brand #dd6b20`, `--accent #1976d2`, `--primary #155dfc`, `--yellow #fdc700`, `--chip #e0e7ff`, `--cb-red #c8102e`). Fonte do sistema.
- Ícones de viatura no padrão do CBMDF: símbolos SVG `i-ur`, `i-ase`, `i-abt`, `i-absl`, `i-ar`, `i-aem`, `i-at`, `i-apsg` (corpo vermelho com faixa branca).
- O layout precisa funcionar no celular (390 px) sem rolagem lateral da página.

## Dois sistemas no repositório

- **Painel original** (`index.html`, `mapa.json`, `tools/`): é o que o GitHub Pages publica. Tudo abaixo, nas seções «Arquivos» a «Testar e publicar», vale para ele.
- **Sistema novo** (`app/`, `server/`, `shared/`, `docs/ARQUITETURA.md`): React + Vite no front e NestJS na API. É uma reescrita do painel, com as mesmas abas, fórmulas e visual (o CSS é o mesmo, em `app/src/styles.css`).
  - A API lê a planilha do Google (Fase 1) pela interface `MatrizDataSource`. Na Fase 2, `SqlServerDataSource` entra no lugar de `GoogleSheetDataSource` em `server/app.module.ts`.
  - Todo código de CSV, `gid` e cabeçalho fica em `server/matriz/sheet/`. Colunas são achadas pelo nome do cabeçalho.
  - Regras: `server/matriz/calculo.ts` (agregados por COMAR e frota) e `shared/poder.ts` (guarnição). As fórmulas da matriz vêm calculadas pela planilha.
  - Rodar: `pnpm dev`. Testar: `pnpm test` e `pnpm typecheck`. Dados fictícios em `tests/fixtures/` (`SHEET_LOCAL_DIR`).
  - Mudou uma regra ou um texto no painel original? Aplique a mesma mudança no sistema novo (e vice-versa) até o corte oficial.

## Arquivos

- `index.html`: o site inteiro. CSS no `<style>`, páginas em `<div class="mo-page" id="pg-...">` e um único `<script>` (IIFE) no fim. Sem React e sem etapa de compilação.
- Bibliotecas por CDN (cdnjs): d3 7.9.0 (gráficos e formatação pt-BR) e Leaflet 1.9.4 (mapa, carregado só ao abrir a aba Visão espacial).
- `mapa.json`: camadas do KMZ «EMOPE – Plano de Emprego – Áreas de Atuação», já convertidas.
- `tools/`: scripts Python para gerar o `mapa.json` a partir de um KMZ novo (ver abaixo).
- `README.md`: resumo para quem abre o repositório.

## Dados

- Planilha publicada na Web (CSV). No topo do script: `PUB` (endereço publicado) e `ABAS` (gid de cada aba):
  `absoluto 1977235102`, `risco 1061038218`, `carga 1948092177`, `params 1866811546`.
- Endereço de cada aba: `${PUB}?gid=${gid}&single=true&output=csv`.
- As colunas são achadas pelo nome do cabeçalho (normalizado), não pela posição. A aba Parâmetros é lida por rótulos (classes, pesos, limites do fator D, constantes do COMAR, matrizes de distância e de tempo).
- Teste local sem internet: `?local=t` lê `t-absoluto.csv`, `t-risco.csv`, `t-carga.csv` e `t-params.csv` na mesma pasta (esses arquivos não ficam no repositório).

## Abas e endereços

Ordem das abas: Matriz, Visão geral, Ranking por natureza, Matriz de risco, Carga operacional, Distâncias, Visão espacial, Poder operacional.

| Aba | `S.page` | Hash | Função principal |
|---|---|---|---|
| Matriz | `tabela` | `#matriz` (padrão) | `buildAbsHead`, `drawAbs`, `GRUPOS`, `COLTIP` |
| Visão geral | `matriz` | `#geral` | `fillValues`, `drawRanking`, `drawSaldos`, `drawCarga` |
| Ranking por natureza | `natureza` | `#natureza` | `fillNatureza`, `drawNatTable` |
| Matriz de risco | `risco` | `#risco` | `renderRisco`, `CRIT` |
| Carga operacional | `carga` | `#carga` | `renderCarga` |
| Distâncias | `distancias` | `#distancias` | `renderDist`, `drawDsMatriz`, `DS` |
| Visão espacial | `espacial` | `#espacial` | `renderEspacial`, `iniciaMapa`, `CAM`, `GE` |
| Poder operacional | `poder` | `#poder` | `renderPoder`, `PO` |

- O filtro de COMAR entra no hash: `#risco-II`, `#espacial-III`.
- `render()` mostra a página de `S.page`. `pageErr(aba, estado)` mostra o aviso de erro da aba.
- Estado geral em `S` (dados, página, COMAR, GBM selecionado).

## Regras de negócio que o site explica

- Efetivo necessário = ARREDONDAR.PARA.CIMA((guarnições das viaturas + SECOM + serviço interno) × 1,3) + expediente.
- Saldo efetivo = efetivo atual − efetivo necessário.
- Saldo considerado = saldo + oficial de dia (4 × 1,3 = 5,2) + 2,5 × cotas de GSV.
- Ralvo = total de ocorrências ÷ total do efetivo atual. Coef. de ajuste = (ocorrências ÷ efetivo atual) ÷ Ralvo.
- Novo efetivo necessário = MÁXIMO(69; ARRED(ocorrências ÷ Ralvo)).
- Carga atualizada = ocorrências ÷ (efetivo necessário + oficial de dia + 2,5 × cotas).
- Matriz de risco: total = 2 × DOP + isolamento + PDO + fator D. DOP = ≤2 × 1,0 + 3 × 6,1 + 4+ × 29,4. Fator D = (extensão + edificações + 2 × risco da área) ÷ 4.
- Matriz: Socorro base = UR, UR (GSV)/Reforço, VME, 2ª VME. Socorro intermediário = VCI, VS, VPA, VE, Apoio. A coluna Apoio AR fica oculta.
- Poder operacional: GBM de 69 = 6 expediente + 5 SECOM + 15 escala de UR + 43 nas 4 alas (Alfa, Bravo, Charlie, Delta). ASE padrão 5 (1 QBMG-2 + 4 QBMG-1), exceção 4. AR 2 a 4 ocupantes; QBMG-1 conduz a AR só fora de emergência. Dois ASE a partir de 8 (ideal 10). Os bombeiros da ala não incluem o adjunto de serviço.

## Mapa (Visão espacial)

- Camadas: quartéis, áreas de atuação, isócronas, Voronoi e regiões administrativas. Cada uma liga, desliga e pode ficar sozinha («Só esta»).
- Os GBMs que ainda não existem (4º, 40º, 42º e 43º) foram retirados do `mapa.json`.
- Fundo: OpenStreetMap (sem chave de API) ou satélite Esri. Se o OpenStreetMap falhar, o site usa só o satélite.
- O KMZ é uma prévia, sujeita a mudanças. Para trocar o mapa:
  1. Extrair o `doc.kml` do KMZ (é um arquivo zip).
  2. `python tools/kml2json.py doc.kml mapa_bruto.json`
  3. `python tools/simplify.py mapa_bruto.json mapa_simples.json 0.00003`
  4. `python tools/remove_gbms.py mapa_simples.json mapa.json`
  5. Conferir os ids das camadas em `CAM` (no script) contra os ids do novo `mapa.json`.

## Testar e publicar

- Rodar local: `python -m http.server 8765` na pasta e abrir `http://localhost:8765/`. Abrir o `index.html` direto do disco não carrega o `mapa.json`.
- Antes de publicar: abrir todas as abas, no computador e no celular, e conferir o console sem erros.
- Publicar: commit no `main` e push. O GitHub Pages publica sozinho.
