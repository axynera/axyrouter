import { Hono } from "hono";

type Credential = {
  apiKey: string;
  baseUrl: string;
  models?: string[];
  enabled?: boolean;
};

type ModelConfig = {
  name: string;
  provider: string;
  model: string;
  credentials?: number[];
};

const app = new Hono();

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });

function envJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(Netlify.env.get(key) || "") as T; } catch { return fallback; }
}

function providers() {
  return envJson<Record<string, { baseUrl: string; credentials: Credential[] }>>(
    "AXY_PROVIDERS",
    {}
  );
}

function models() {
  return envJson<Record<string, ModelConfig>>("AXY_MODELS", {});
}

function pickCredential(list: Credential[]) {
  const healthy = list.filter(x => x.enabled !== false && x.apiKey && x.baseUrl);
  if (!healthy.length) return null;
  return healthy[Math.floor(Math.random() * healthy.length)];
}

async function forwardOpenAI(c: any, body: any) {
  const cfg = models()[body.model];
  if (!cfg) return json({ error: { message: `Unknown model: ${body.model}`, type: "invalid_request_error" } }, 404);

  const provider = providers()[cfg.provider];
  if (!provider) return json({ error: { message: "Provider not configured", type: "configuration_error" } }, 500);

  const creds = cfg.credentials?.map(i => provider.credentials[i]).filter(Boolean) || provider.credentials;
  const credential = pickCredential(creds);
  if (!credential) return json({ error: { message: "No healthy credentials", type: "provider_error" } }, 503);

  const url = credential.baseUrl.replace(/\/$/, "") + "/chat/completions";
  const upstreamBody = { ...body, model: cfg.model };

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${credential.apiKey}`
    },
    body: JSON.stringify(upstreamBody)
  });

  const headers = new Headers(upstream.headers);
  if (body.stream) {
    headers.set("content-type", "text/event-stream; charset=utf-8");
    headers.set("cache-control", "no-cache, no-transform");
    headers.set("connection", "keep-alive");
  } else {
    headers.set("content-type", "application/json");
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}

app.get("/health", c => c.json({ ok: true, service: "AxyRouter", runtime: "Netlify Edge", framework: "Hono" }));

app.get("/v1/models", c => {
  const data = Object.values(models()).map((m, i) => ({
    id: m.name, object: "model", created: 0, owned_by: "axynity", index: i
  }));
  return c.json({ object: "list", data });
});

app.post("/v1/chat/completions", async c => {
  try {
    const body = await c.req.json();
    return await forwardOpenAI(c, body);
  } catch (e) {
    return json({ error: { message: e instanceof Error ? e.message : "Gateway error", type: "gateway_error" } }, 500);
  }
});

app.post("/v1/messages", async c => {
  try {
    const body = await c.req.json();
    const converted = {
      model: body.model,
      messages: body.messages || [],
      max_tokens: body.max_tokens ?? 1024,
      stream: body.stream ?? false
    };
    const response = await forwardOpenAI(c, converted);
    return response;
  } catch (e) {
    return json({ error: { message: e instanceof Error ? e.message : "Gateway error", type: "gateway_error" } }, 500);
  }
});

app.all("*", c => c.json({ error: { message: "Not found", type: "not_found" } }, 404));

export default app;
