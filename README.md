# Matriz Operacional · CBMDF

Painel da Matriz Operacional do CBMDF, lido da planilha publicada na Web.

Abas do painel: Matriz, Visão geral, Ranking por natureza, Matriz de risco, Carga operacional, Distâncias, Visão espacial e Poder operacional.

- A página lê, a cada acesso, as abas **Absoluto**, **Matriz de Risco**, **Carga Operacional** e **Parâmetros** da planilha publicada em CSV. Alterações na planilha aparecem em alguns minutos (o Google guarda o CSV publicado em cache por pouco tempo).
- Configuração no início do script de `index.html`: `PUB` é o endereço da planilha publicada (sem `?output=csv`) e `ABAS` traz o `gid` de cada aba. Se a aba de um novo mês for outra, troque o `gid` correspondente.
- A aba **Visão espacial** lê `mapa.json`, convertido do KMZ «EMOPE - Plano de Emprego - Areas de Atuação» (quartéis, áreas de atuação, isócronas, polígonos de Voronoi e regiões administrativas). Foram retirados os GBMs que ainda não existem (4º, 40º, 42º e 43º). O mapa usa Leaflet, com fundo OpenStreetMap ou satélite Esri (sem chave de API); se o OpenStreetMap falhar, fica só o satélite. Para trocar o mapa, gere um novo `mapa.json` a partir do KMZ atualizado.
- Endereços diretos: `#matriz` (padrão), `#geral`, `#natureza`, `#risco`, `#carga`, `#distancias`, `#espacial`, `#poder`. Acrescente o COMAR para abrir já filtrado, por exemplo `#risco-II` ou `#espacial-III`.
