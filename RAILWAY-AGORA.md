# Atualizar o Railway AGORA (sem token)

O código **já está no GitHub**: https://github.com/kauan123749578/bot_telegram (commit `2b2e3ad`).

O site ainda mostra **0.4.2** porque o Railway está com erro **"GitHub Repo not found"** — ele não puxa commit novo.

---

## Faça só isso (2 minutos)

### 1. Abra o serviço certo
- railway.app → projeto **reliable-reflection** → clique no card **bot_telegram** (não no Postgres)

### 2. Aba Settings (você já está aí)
- Em **Source Repo** está `kauan123749578/bot_telegram`
- Clique no botão vermelho **Disconnect**

### 3. Conectar de novo
- Clique **Connect Repo** (ou **Connect GitHub**)
- Autorize o GitHub se pedir
- Escolha: **kauan123749578/bot_telegram**
- Branch: **main**
- Salve

### 4. Deploy
- Vá na aba **Deployments** (ao lado de Settings)
- Clique **Deploy** → **Deploy latest commit**
- Espere ficar **ACTIVE** (verde)

### 5. Testar
Abra: https://bottelegram-production-8449.up.railway.app/health

Deve aparecer: `"version": "0.5.1"`

---

## Se o deploy falhar de novo (vermelho "network process")

1. **Settings** → **Networking** → porta **3000** (ou a variável `PORT` em Variables)
2. **Variables** → confira `DATABASE_URL`, `PANEL_PASSWORD`, `OPENAI_API_KEY`
3. **Deployments** → clique no deploy falho → **View logs** → mande o erro

---

## Daqui pra frente

Sempre que mudar o código:

```bash
git push origin main
```

(`origin` = bot_telegram = o que o Railway lê)

Não precisa de token no GitHub.
