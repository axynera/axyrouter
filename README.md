# AxyRouter ⚡

Ultra-lightweight Hono + Netlify Edge AI gateway.

## Features
- OpenAI SDK compatible: /v1/chat/completions
- Anthropic SDK compatible: /v1/messages
- Custom public model aliases
- Multiple provider credentials
- Direct SSE ReadableStream passthrough
- Custom JSON configuration
- /v1/models and /health

## Add Provider

Di Netlify buka Project configuration → Environment variables.

Tambahkan variable `AXY_PROVIDERS` dengan JSON:

    {
      "deepseek": {
        "baseUrl": "https://api.deepseek.com/v1",
        "credentials": [
          {"apiKey": "KEY_1", "enabled": true},
          {"apiKey": "KEY_2", "enabled": true}
        ]
      },
      "qwen": {
        "baseUrl": "https://your-provider.example/v1",
        "credentials": [{"apiKey": "KEY_QWEN", "enabled": true}]
      }
    }

Provider harus menyediakan endpoint OpenAI-compatible `/chat/completions` untuk adapter bawaan.

## Custom AI name / model alias

Tambahkan `AXY_MODELS`:

    {
      "Axynity X-Dev": {
        "name": "Axynity X-Dev",
        "provider": "deepseek",
        "model": "deepseek-chat",
        "credentials": [0, 1]
      },
      "Axynity": {
        "name": "Axynity",
        "provider": "qwen",
        "model": "qwen-model",
        "credentials": [0]
      }
    }

Client cukup mengirim `Axynity X-Dev`. Model asli provider tidak perlu diketahui client.

Untuk memakai credential tertentu, isi `credentials` dengan index. Credential dengan `enabled: false` akan dilewati.

## OpenAI SDK

Install `openai`, lalu gunakan baseURL:

    import OpenAI from "openai";
    const client = new OpenAI({
      apiKey: "AXY-your-key",
      baseURL: "https://YOUR-SITE.netlify.app/v1"
    });
    const stream = await client.chat.completions.create({
      model: "Axynity X-Dev",
      messages: [{role: "user", content: "Hello"}],
      stream: true
    });
    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content || "");
    }

## Anthropic SDK

Install `@anthropic-ai/sdk`, lalu gunakan baseURL yang sama:

    import Anthropic from "@anthropic-ai/sdk";
    const client = new Anthropic({
      apiKey: "AXY-your-key",
      baseURL: "https://YOUR-SITE.netlify.app/v1"
    });
    const stream = await client.messages.create({
      model: "Axynity X-Dev",
      max_tokens: 4096,
      messages: [{role: "user", content: "Buatkan kode TypeScript"}],
      stream: true
    });
    for await (const event of stream) {
      console.log(event);
    }

## Endpoints

- `GET /health`
- `GET /v1/models`
- `POST /v1/chat/completions` — OpenAI
- `POST /v1/messages` — Anthropic

## Speed

Streaming tidak dibuffer sampai selesai. Router meneruskan `ReadableStream` dari upstream ke client sehingga jalur utamanya:

    SDK → Netlify Edge → Hono → Provider → ReadableStream → SDK

## Notes

Adapter bawaan mengharapkan backend provider memiliki API OpenAI Chat Completions. Provider dengan API native berbeda dapat diberi adapter khusus tanpa mengubah nama AI publik.