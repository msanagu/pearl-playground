# Pearl Playground

A test bed for `@msanagu/pearl`'s [manifest.json / llms.txt](https://github.com/msanagu/pearl/blob/main/docs/decisions/0008-dsds-aligned-machine-readable-manifest.md) — installed the same way a real consumer would (a packed tarball, not a symlink into the source repo), so `node_modules/@msanagu/pearl/dist/` genuinely has only what npm ships.

## Why this exists

Pearl's manifest/`llms.txt` are meant to let a client-side coding agent (Copilot, Cursor, etc.) generate on-system UI — correct components, correct theme tokens, correct role/treatment usage — without a retrieval layer or an MCP server standing between it and the truth. This repo is where that claim gets tested against a real install, not just read as a design doc.

**Phase 1:** confirmed the package installs and renders correctly, and that the manifest/`llms.txt` land where a client-side agent would actually look for them.

**Phase 2 (current):** a chatbot-driven "vibe coding" surface — the user supplies their own Anthropic API key, describes what they want, and Claude generates code that renders live in-browser via `react-live`. The system prompt is built entirely from the installed package's manifest data (component APIs, real usage examples, per-theme role/treatment tables, override contract, token semantics) — no hand-written coaching layered on top, so hallucinated props or invented components are a real signal about the manifest's sufficiency, not a bug to quietly patch. No heavy MCP; just what's already sitting in `node_modules`.

## Verifying the install

```bash
cat node_modules/@msanagu/pearl/dist/llms.txt
cat node_modules/@msanagu/pearl/dist/manifest.json
```

## Stack

Vite + React + TypeScript, scaffolded from `create-vite`. `react-live` for the in-browser render sandbox, `@anthropic-ai/sdk` for the assistant, `react-markdown` for chat rendering, `react-icons` for the curated icon set generated code can reference.
