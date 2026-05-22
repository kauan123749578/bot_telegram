# Rodar BotManager localmente (sem pagar Railway)

Quando o Railway mostra **Trial maxed out**, novos deploys param — mas você pode testar **100% no seu PC**.

## Modo rápido (sem Postgres)

Usa arquivos em `data/` (bots, leads, uploads). Ideal para testar painel + bot.

### 1. Instalar

```powershell
cd c:\Users\kauan\Downloads\projetoIA
npm install
```

### 2. Configurar `.env`

Copie de `.env.example` e ajuste:

```env
PORT=3000
PANEL_PASSWORD=sua-senha-forte
ADMIN_EMAIL=admin@botmanager.local
OPENAI_API_KEY=sua-chave-openai

# Opcional: bot já no .env — ou crie pelo painel depois
TELEGRAM_BOT_TOKEN=
PIX_KEY=
```

**Não** preencha `DATABASE_URL` neste modo.

### 3. Subir

```powershell
npm run dev
```

### 4. Abrir

- **Painel (login):** http://localhost:3000/login  
  (não use só `/health` — essa rota devolve JSON de status, não a tela do painel)
- Login: e-mail `admin@botmanager.local` + senha do `PANEL_PASSWORD` no `.env`
- Health (JSON): http://localhost:3000/health — deve mostrar `{"ok":true,"version":"...","mode":"files"}`

Se o terminal mostrar erro `ECONNREFUSED :5432`, deixe `DATABASE_URL=` vazio no `.env` (o app cai para `data/` automaticamente).

### 5. Telegram

Crie a instância no painel (**Nova instância** ou **Editar**) com token do [@BotFather](https://t.me/BotFather).

O bot responde no Telegram enquanto o terminal `npm run dev` estiver aberto.

---

## Modo completo (com Postgres local)

Igual produção (multi-usuário, remarketing, histórico).

### 1. Postgres com Docker

```powershell
docker compose up -d
```

### 2. `.env` — adicione

```env
DATABASE_URL=postgresql://botmanager:botmanager@localhost:5432/botmanager
```

### 3. Rodar

```powershell
npm run dev
```

Na primeira vez o app cria as tabelas automaticamente.

---

## Comandos úteis

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desenvolvimento (recarrega ao editar) |
| `npm run build` | Compilar TypeScript |
| `npm start` | Produção local (`dist/`) |

## Uploads e mídias

Ficam em `data/uploads/` — persistem entre reinícios.

## Quando pagar o Railway de novo

1. Faça upgrade do plano
2. Redeploy ou configure secrets do GitHub Actions (`DEPLOY-RAILWAY.md`)
3. Confira `/health` com `version` nova

## Segurança

Não commite `.env` no GitHub (tokens e senhas).
