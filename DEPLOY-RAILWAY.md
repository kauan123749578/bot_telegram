# Deploy no Railway

## Conta nova / primeiro deploy

Siga o guia completo: **[RAILWAY-SETUP.md](./RAILWAY-SETUP.md)** (Postgres, volume, variáveis, domínio).

## Situação — redeploy

O código no GitHub pode estar **mais novo** que o que está no ar.

Confira: abra `https://SEU-DOMINIO.up.railway.app/health`

- Se `"version": "0.4.0"` → deploy **ok**
- Versão menor → faça redeploy (opções abaixo)

## Opção A — Redeploy manual (mais rápido)

1. Acesse [Railway](https://railway.app) → projeto → serviço **telegramIA**
2. Aba **Deployments**
3. Clique nos **⋮** do deploy mais recente do GitHub (ou **Deploy** → **Deploy latest commit**)
4. Aguarde **Deployment successful**
5. Teste de novo `/health`

Se não aparecer commit novo:

1. **Settings** → **Source**
2. Repositório: `wqiprime-gif/telegramIA` · Branch: **main** · Root: **/**
3. **Disconnect** → **Connect GitHub** de novo e autorize
4. Volte em **Deployments** e faça redeploy

## Deploy automático (sem token)

O repositório está ligado ao Railway. Cada **push na `main`** pode disparar deploy sozinho.

No GitHub só roda **CI** (testa build) — **não precisa** de `RAILWAY_TOKEN`.

## Opção B — CLI local

```bash
npm install -g @railway/cli
railway login
cd projetoIA
railway link
railway up
```

## Interrupção do Railway

Se aparecer banner **Service Disruption**, aguarde normalizar ou use a Opção B/C.
