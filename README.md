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

Provider sepenuhnya generic. Tidak ada DeepSeek, Qwen, OpenAI, atau provider tertentu yang di-hardcode.

Contoh provider bebas:

    AXY_PROVIDER_PROVIDER_A_BASE_URL=https://provider-a.example/v1
    AXY_PROVIDER_PROVIDER_A_KEY_1=KEY_1
    AXY_PROVIDER_PROVIDER_A_KEY_2=KEY_2

    AXY_PROVIDER_PROVIDER_B_BASE_URL=https://provider-b.example/v1
    AXY_PROVIDER_PROVIDER_B_KEY_1=KEY_1

Nama provider berasal dari bagian setelah `AXY_PROVIDER_`. Kamu bisa menambahkan provider sebanyak yang diperlukan tanpa mengubah source code.

Setiap provider bisa memiliki beberapa credential. Credential aktif dipilih dengan round-robin per model/provider.

Provider harus menyediakan endpoint OpenAI-compatible `/chat/completions` untuk adapter bawaan.

## Custom AI name / model alias

Tambahkan `AXY_MODELS`:

    {
      "Axynity X-Dev": {
        "name": "Axynity X-Dev",
        "provider": "PROVIDER_A",
        "model": "backend-model",
        "credentials": [0, 1]
      },
      "Axynity": {
        "name": "Axynity",
        "provider": "PROVIDER_B",
        "model": "backend-model"
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

## Custom Axynera JSON

Untuk konfigurasi yang lebih bebas, gunakan `AXY_CONFIG`. Contoh:

    {
      "name": "Axynera AI",
      "developer": "Axynera",
      "website": "https://your-domain.example",
      "version": "1.0.0",
      "defaultModel": "Axynity",
      "heartbeat": true
    }

Field ini dapat dipakai untuk identitas gateway, developer, versi, dan default model tanpa mengubah source code.

## Custom Developer / Branding

Nama developer dan identitas publik tidak dikunci. Ubah `AXY_CONFIG.developer`, `AXY_CONFIG.name`, dan `AXY_CONFIG.version` sesuai branding sendiri.

## Heartbeat

AxyRouter menyediakan konfigurasi heartbeat di `AXY_HEARTBEAT` untuk health monitoring:

    {
      "enabled": true,
      "interval": 30000
    }

`GET /health` mengembalikan konfigurasi heartbeat saat aktif. Heartbeat sebaiknya dipakai hanya jika memang dibutuhkan monitoring; jangan membuat ping terlalu sering karena Edge function tetap akan menerima request.

## Gateway API keys

Jika ingin membatasi akses client, tambahkan `AXY_KEYS`:

    ["Axy-client-key-1", "Axy-client-key-2"]

Client mengirim:

    Authorization: Bearer Axy-client-key-1

Jika `AXY_KEYS` kosong, authentication gateway dinonaktifkan.
