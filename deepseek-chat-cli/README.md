# DeepSeek Chat CLI

A minimal terminal chatbot using the DeepSeek API (OpenAI-compatible endpoint).

## Setup

```bash
cd deepseek-chat-cli
npm install
cp .env.example .env
# edit .env and add your DEEPSEEK_API_KEY (get one at platform.deepseek.com)
```

By default the model is `deepseek-chat`. If your account has access to a different
model name, set `DEEPSEEK_MODEL` in `.env` to that exact model ID.

## Run

```bash
npm start
```

Type messages at the `You:` prompt. Type `exit` to quit.
