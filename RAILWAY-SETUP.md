# Deploy no Railway (conta nova) — passo a passo

Guia para subir o **BotManager** do zero em uma conta Railway paga, com **PostgreSQL** e deploy automático pelo GitHub.

## 1. Subir código no GitHub

O repositório oficial do projeto:

**https://github.com/wqiprime-gif/telegramIA**

Se você acabou de atualizar o código local, faça push na branch `main` (já deve estar sincronizado após o commit `v0.4.0`).

## 2. Criar projeto no Railway

1. Acesse [railway.app](https://railway.app) com a **conta nova** (paga).
2. **New Project** → **Deploy from GitHub repo**.
3. Conecte o GitHub e escolha o repositório **`telegramIA`** (ou o fork que você usar).
4. Branch: **`main`** · Root directory: **`/`** (raiz do repo).

## 3. Banco PostgreSQL

1. No projeto Railway: **+ New** → **Database** → **PostgreSQL**.
2. Clique no serviço **Postgres** → aba **Variables** (ou **Connect**).
3. No serviço do **app** (Node), adicione a variável referenciada:
   - **`DATABASE_URL`** = `${{Postgres.DATABASE_URL}}`  
     (use o botão **Add reference** e selecione o Postgres)
   - Opcional: **`DATABASE_PUBLIC_URL`** = `${{Postgres.DATABASE_PUBLIC_URL}}`

O app detecta Railway e cria as tabelas automaticamente na primeira subida.

## 4. Volume para uploads (áudios, fotos, avatares)

Sem volume, arquivos em `/uploads` **somem** a cada redeploy.

1. No serviço do app: **Settings** → **Volumes** → **Add Volume**.
2. Mount path: **`/data`**
3. Variável no app:
   - **`DATA_DIR`** = `/data`

## 5. Variáveis obrigatórias do app

No serviço **Node** → **Variables**:

| Variável | Exemplo | Obrigatório |
|----------|---------|-------------|
| `PANEL_PASSWORD` | senha forte do painel | Sim |
| `SESSION_SECRET` | string longa aleatória (32+ chars) | Sim |
| `OPENAI_API_KEY` | `sk-...` | Sim (ou configure depois no painel) |
| `ADMIN_EMAIL` | `admin@botmanager.local` | Recomendado |
| `DATABASE_URL` | referência ao Postgres | Sim |
| `DATA_DIR` | `/data` | Sim (com volume) |
| `PORT` | Railway define sozinho | Não preencher |

Opcionais (bot inicial ou depois pelo painel):

- `TELEGRAM_BOT_TOKEN`
- `BOT_PROMPT`
- `PIX_KEY`

**Não** copie o `.env` local para o Railway — crie as variáveis no painel.

## 6. Domínio e health check

1. Serviço app → **Settings** → **Networking** → **Generate Domain**.
2. O deploy usa `/health` — deve retornar:
   ```json
   {"ok":true,"version":"0.4.0","database":true,"mode":"postgres"}
   ```

## 7. Primeiro acesso ao painel

1. Abra `https://SEU-DOMINIO.up.railway.app/login`
2. Login: e-mail `ADMIN_EMAIL` (padrão `admin@botmanager.local`) + senha `PANEL_PASSWORD`.
3. **Configurações** → OpenAI API Key (se não colocou em variável).
4. **Nova instância** → token do BotFather, prompt, Pix, áudios (`/audios`).

## 8. Deploy automático (GitHub Actions)

Se o webhook do Railway não atualizar sozinho:

1. Railway → **Account** → **Tokens** → criar token.
2. Serviço app → **Settings** → copiar **Service ID**.
3. GitHub → repo → **Settings** → **Secrets** → **Actions**:
   - `RAILWAY_TOKEN`
   - `RAILWAY_SERVICE_ID`
4. Cada push na `main` roda `.github/workflows/deploy-railway.yml`.

## 9. Migrar da conta antiga

A conta antiga (`telegramia-production.up.railway.app`) **não** leva dados para a nova. Na conta nova:

- Banco vazio → usuário admin criado na primeira subida.
- Recrie instâncias de bot no painel.
- Reenvie áudios/mídias (ou restaure backup do Postgres + pasta `/data` se tiver).

## 10. Checklist rápido

- [ ] Postgres ligado e `DATABASE_URL` referenciada
- [ ] Volume `/data` + `DATA_DIR=/data`
- [ ] `PANEL_PASSWORD` e `SESSION_SECRET` definidos
- [ ] Domínio público gerado
- [ ] `/health` com `version` **0.4.0**
- [ ] Login no painel OK
- [ ] Bot Telegram respondendo

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| App crasha ao iniciar | Ver **Deploy Logs**; falta `PANEL_PASSWORD` ou Postgres offline |
| `database: false` no health | `DATABASE_URL` não referenciada ao Postgres |
| Uploads somem | Criar volume e `DATA_DIR=/data` |
| Versão antiga no ar | Redeploy manual ou configurar secrets do GitHub Actions |
