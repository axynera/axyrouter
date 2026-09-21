# AxyRouter

Lightweight Hono + Netlify Edge AI gateway.

## Features
- Custom public model names / aliases
- OpenAI-compatible /v1/chat/completions
- /v1/models
- Anthropic-style /v1/messages endpoint
- SSE streaming passthrough
- Multiple credentials per provider
- Provider/model separation
- No provider keys hard-coded in source
- Designed for Netlify Edge

## Environment

AXY_PROVIDERS:
{
  "deepseek": {
    "baseUrl": "https://api.example.com/v1",
    "credentials": [
      {"apiKey":"KEY_1","enabled":true},
      {"apiKey":"KEY_2","enabled":true}
    ]
  }
}

AXY_MODELS:
{
  "Axynity X-Dev": {
    "name":"Axynity X-Dev",
    "provider":"deepseek",
    "model":"deepseek-chat",
    "credentials":[0,1]
  }
}

A client can request:
POST /v1/chat/completions
{"model":"Axynity X-Dev","messages":[{"role":"user","content":"Hello"}],"stream":true}

The public alias stays the same even when the upstream model changes.

## SDK compatibility

OpenAI SDK can use:
baseURL = https://YOUR-SITE/v1

Anthropic-compatible clients can use:
baseURL = https://YOUR-SITE/v1

For provider-specific request/response differences, add adapters in api.ts rather than exposing upstream model names.
