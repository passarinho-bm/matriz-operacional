# Implantação · Matriz Operacional

O sistema roda em **um processo só** (porta 3001). Ele serve a API e as telas.
Ele só lê a planilha do Google. Nunca escreve nela.

## O que o servidor precisa

- **Saída para a internet** até `docs.google.com` (porta 443). Sem isso, não há dados.
  Peça à TI a liberação desse endereço no firewall e no proxy.
- **Entrada** na porta 3001 (ou outra porta, com um proxy reverso na frente).
- **Docker** (pacote A) **ou** **Node.js 22 ou mais novo** (pacote B).

## Pacote A · com Docker (`matriz-operacional-docker.zip`)

```bash
unzip matriz-operacional-docker.zip
cd matriz-operacional
cp .env.example .env.production      # ajuste se precisar
docker compose --env-file .env.production -f compose.yml up -d --build
```
O `--build` baixa as bibliotecas da internet (registro npm). Se o servidor não alcança o npm, use o pacote B.

Parar: `docker compose down`. Ver registros: `docker compose logs -f`.

## Pacote B · só com Node.js, já compilado (`matriz-operacional-node.zip`)

Já vem compilado e com as bibliotecas dentro. Não precisa de internet para instalar.

```bash
unzip matriz-operacional-node.zip
cd matriz-operacional
node -v                  # precisa ser v22 ou mais novo
./iniciar.sh             # sobe na porta 3001
```

Para manter ligado depois de fechar o terminal, use o **PM2** ou o **systemd**.

PM2:
```bash
npm install -g pm2
pm2 start dist/server/main.js --name matriz-operacional
pm2 save && pm2 startup
```

systemd (`/etc/systemd/system/matriz-operacional.service`):
```ini
[Unit]
Description=Matriz Operacional CBMDF
After=network.target

[Service]
WorkingDirectory=/opt/matriz-operacional
ExecStart=/usr/bin/node dist/server/main.js
Environment=API_PORT=3001
Restart=always
User=matriz

[Install]
WantedBy=multi-user.target
```

## Variáveis de ambiente

| Variável | Padrão | Para que serve |
|---|---|---|
| `API_PORT` | `3001` | Porta do sistema. |
| `API_HOST` | `0.0.0.0` | Endereço de escuta. |
| `SHEET_PUB_URL` | planilha atual | Endereço da planilha publicada na Web. |
| `SHEET_GID_ABSOLUTO`, `_RISCO`, `_CARGA`, `_PARAMS` | gids atuais | Aba de cada leitura. |
| `SHEET_CACHE_SECONDS` | `300` | Tempo de cache da leitura. |
| `SHEET_LOCAL_DIR` | vazio | Teste sem internet (arquivos `t-*.csv`). **Não use em produção.** |

## Como conferir

- `http://servidor:3001/api/health` responde `{"status":"ok"}`.
- `http://servidor:3001/api/status` mostra as 4 abas com `"status":"ok"`.
- `http://servidor:3001/` abre o painel com as 8 abas.

Se uma aba mostrar «Não foi possível alcançar o Google», o servidor está sem saída para `docs.google.com`.

## Segurança

- O sistema é público e não tem login (como o painel original). Se a rede interna exigir autenticação, coloque um proxy reverso (nginx, Apache) com HTTPS e controle de acesso na frente.
- Não há senha nem chave no sistema. A planilha publicada não exige credencial.
- O mapa usa OpenStreetMap e Esri. As máquinas dos usuários precisam alcançar `tile.openstreetmap.org` ou `server.arcgisonline.com`. Sem isso, as camadas aparecem sem o fundo.
