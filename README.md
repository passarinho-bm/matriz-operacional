# Matriz Operacional · CBMDF

Painel da Matriz Operacional do CBMDF, lido da planilha publicada na Web.

Abas do painel: Matriz operacional, Tabela Absoluto, Ranking por natureza, Matriz de risco, Carga operacional e Poder operacional.

- A página lê, a cada acesso, as abas **Absoluto**, **Matriz de Risco**, **Carga Operacional** e **Parâmetros** da planilha publicada em CSV. Alterações na planilha aparecem em alguns minutos (o Google guarda o CSV publicado em cache por pouco tempo).
- Configuração no início do script de `index.html`: `PUB` é o endereço da planilha publicada (sem `?output=csv`) e `ABAS` traz o `gid` de cada aba. Se a aba de um novo mês for outra, troque o `gid` correspondente.
- Endereços diretos: `#tabela`, `#natureza`, `#risco`, `#carga`, `#poder`. Acrescente o COMAR para abrir já filtrado, por exemplo `#risco-II`.
