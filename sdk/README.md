# @axynera/sdk

Official TypeScript/JavaScript SDK for Axynera and AxyRouter.

## Install

npm install @axynera/sdk

## Usage

import Axynera from "@axynera/sdk";

const axy = new Axynera({
  apiKey: "Axy-your-key",
  baseURL: "https://YOUR-DOMAIN.netlify.app"
});

const response = await axy.chat.completions.create({
  model: "Axynity X-Dev",
  messages: [{role:"user",content:"Hello"}]
});

console.log(response.choices[0].message.content);

## Streaming

const stream = await axy.chat.completions.create({
  model: "Axynity X-Dev",
  messages: [{role:"user",content:"Buat kode TypeScript"}],
  stream: true
});

for await (const chunk of stream) console.log(chunk);

## Anthropic-compatible endpoint

const result = await axy.messages.create({
  model: "Axynity",
  max_tokens: 1024,
  messages: [{role:"user",content:"Halo"}]
});

AxyRouter keeps the public model name stable while its backend provider/model can be changed in JSON configuration.