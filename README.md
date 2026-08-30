# Pearl Playground

A test bed for `@msanagu/pearl`'s [manifest.json / llms.txt](https://github.com/msanagu/pearl/blob/main/docs/decisions/0008-dsds-aligned-machine-readable-manifest.md) — installed the same way a real consumer would (a packed tarball, not a symlink into the source repo), so `node_modules/@msanagu/pearl/dist/` genuinely has only what npm ships.

## Why this exists

Pearl's manifest/`llms.txt` are meant to let a client-side coding agent (Copilot, Cursor, etc.) generate on-system UI — correct components, correct theme tokens, correct role/treatment usage — without a retrieval layer or an MCP server standing between it and the truth. This repo is where that claim gets tested against a real install, not just read as a design doc.

**Phase 1 (current):** confirm the package installs and renders correctly, and that the manifest/`llms.txt` land where a client-side agent would actually look for them.

**Phase 2 (not started):** a chatbot-driven "vibe coding" surface — a user supplies their own LLM API key, describes what they want, and the generated code gets checked against Pearl's real components/tokens/roles, grounded entirely by the installed package's structured data. No heavy MCP; just what's already sitting in `node_modules`.

## Verifying the install

```bash
cat node_modules/@msanagu/pearl/dist/llms.txt
cat node_modules/@msanagu/pearl/dist/manifest.json
```

## Stack

Vite + React + TypeScript, scaffolded from `create-vite`. Nothing else added yet.
