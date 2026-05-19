# Bot Telegram IA

Projeto simples para rodar no Railway com:

- Painel web para cadastrar bots.
- Prompt/persona por bot.
- Chave Pix por bot.
- Envio de previas por URL quando o lead pedir.
- Delay configuravel antes das mensagens.
- Analise de comprovante por imagem usando OpenAI Vision.
- Analise de comprovante em PDF extraindo texto e validando com IA.
- Entrega automatica por URL quando a IA aprovar o comprovante.

## Rodar local

Copie o ambiente:

```bash
cp .env.example .env
```

Preencha no `.env`:

```env
OPENAI_API_KEY=""
PANEL_PASSWORD="uma-senha-forte"
TELEGRAM_BOT_TOKEN=""
BOT_PROMPT=""
PIX_KEY=""
```

Instale e rode:

```bash
npm install
npm run dev
```

Abra o painel:

```text
http://localhost:3000
```

## Deploy no Railway

1. Suba este repositorio no GitHub.
2. Crie um projeto no Railway a partir do GitHub.
3. Configure as variaveis do `.env.example` no Railway.
4. Deploy.

O app usa `npm start` e abre o painel na propria URL do Railway.

## Observacoes

O MVP salva os bots em `data/bots.json`. Isso deixa o projeto simples para testar. Quando o produto estiver validado, o proximo passo e trocar esse JSON por PostgreSQL/Supabase para persistencia real.

## Comprovantes

O bot aceita comprovante enviado no Telegram como:

- foto/imagem;
- imagem enviada como arquivo;
- PDF.

Imagens sao analisadas pela visao da OpenAI. PDFs sao baixados, têm o texto extraido e depois sao analisados pela IA para decidir se parecem um Pix pago.
