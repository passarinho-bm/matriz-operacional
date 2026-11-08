# Matriz Operacional · CBMDF

Painel da Matriz Operacional do Comando Operacional do CBMDF.

Este repositório tem **dois sistemas**:

| Sistema | Onde | Como roda |
|---|---|---|
| **Painel original** (HTML único) | `index.html`, `mapa.json`, `tools/` | Publicado no GitHub Pages: https://passarinho-bm.github.io/matriz-operacional/ |
| **Matriz Operacional v1.0** (React + NestJS) | `app/`, `server/`, `shared/` | Precisa de um servidor Node (ou Docker). Não roda no GitHub Pages. |

O painel original é a referência funcional e visual. O sistema novo tem as mesmas 8 abas, as mesmas fórmulas e o mesmo visual.
Com os mesmos dados, as telas ficam iguais pixel a pixel.

## Sistema novo (React + NestJS)

- **Fase 1 (esta):** a fonte de dados é a planilha do Google publicada em CSV. O sistema só lê. Nunca escreve na planilha.
- **Fase 2 (futura):** a fonte passa a ser o SQL Server. O código já está pronto para a troca (`MatrizDataSource`). Veja `docs/ARQUITETURA.md`.

```bash
pnpm install
pnpm dev          # API em :3001 e front em :3000 (http://localhost:3000)
pnpm test         # compila a API e roda os testes
pnpm typecheck    # confere os tipos da API e do front
pnpm run build    # gera dist/ (API) e dist/app (front)
pnpm start        # produção: um processo serve a API e o front em :3001
```

Teste sem internet: `SHEET_LOCAL_DIR=tests/fixtures pnpm dev:api`. A pasta traz dados **fictícios**.

Produção com Docker:

```bash
cp .env.example .env.production   # ajuste se precisar
docker compose --env-file .env.production -f compose.yml up -d --build
```

Variáveis em `.env.example`: endereço da planilha, `gid` de cada aba, tempo de cache, portas e origem do CORS.
Nunca coloque `.env.production` no repositório.

Cada aba falha sozinha. Se a leitura nova falha e há cache, a tela mostra o cache e avisa. O botão «Recarregar dados» pede uma leitura nova.

## Painel original

Abas do painel: Matriz, Visão geral, Ranking por natureza, Matriz de risco, Carga operacional, Distâncias, Visão espacial e Poder operacional.

- A página lê, a cada acesso, as abas **Absoluto**, **Matriz de Risco**, **Carga Operacional** e **Parâmetros** da planilha publicada em CSV. Alterações na planilha aparecem em alguns minutos (o Google guarda o CSV publicado em cache por pouco tempo).
- Configuração no início do script de `index.html`: `PUB` é o endereço da planilha publicada (sem `?output=csv`) e `ABAS` traz o `gid` de cada aba. Se a aba de um novo mês for outra, troque o `gid` correspondente.
- A aba **Visão espacial** lê `mapa.json`, convertido do KMZ «EMOPE - Plano de Emprego - Areas de Atuação» (quartéis, áreas de atuação, isócronas, polígonos de Voronoi e regiões administrativas). Foram retirados os GBMs que ainda não existem (4º, 40º, 42º e 43º). O mapa usa Leaflet, com fundo OpenStreetMap ou satélite Esri (sem chave de API); se o OpenStreetMap falhar, fica só o satélite. Para trocar o mapa, gere um novo `mapa.json` a partir do KMZ atualizado com os scripts da pasta `tools/` (passo a passo em `CLAUDE.md`).
- Endereços diretos: `#matriz` (padrão), `#geral`, `#natureza`, `#risco`, `#carga`, `#distancias`, `#espacial`, `#poder`. Acrescente o COMAR para abrir já filtrado, por exemplo `#risco-II` ou `#espacial-III`.
- `CLAUDE.md` reúne o contexto do projeto (regras, estrutura do código, fórmulas e como publicar) para quem for trabalhar no site com o Claude Code.
