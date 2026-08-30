import { useMemo, useState } from 'react';
import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey } from './apiKeyStore';
import { buildSystemPrompt } from './systemPrompt';
import type { ChatMessage } from './ChatMessage';
import type { ThemeName } from './themeRegistry';

// Local-dev convenience only: falls back to .env.local so testing doesn't
// require re-entering a key every reload. The deployed build has no env var
// at all — visitors there always go through the BYOK gate.
const DEV_FALLBACK_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

/** Extracts the human-readable message from the API's nested error body, falling back to the SDK's own formatted message. */
function apiErrorMessage(err: APIError): string {
  const body = err.error as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? err.message;
}

export function useAssistant(activeTheme: ThemeName) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(() => getStoredApiKey() ?? DEV_FALLBACK_KEY ?? null);

  // Rebuilt whenever the canvas's active theme changes — see systemPrompt.ts
  // for why (it filters the manifest to just that theme).
  const systemPrompt = useMemo(() => buildSystemPrompt(activeTheme), [activeTheme]);

  // Client-side only, by design — see anthropicClient's former disclaimer,
  // now the BYOK gate's own disclaimer text: every visitor supplies their
  // own key, stored only in their browser, used directly against Anthropic.
  const client = useMemo(() => (apiKey ? new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) : null), [apiKey]);

  function setApiKey(key: string) {
    setStoredApiKey(key);
    setApiKeyState(key);
  }

  function clearApiKey() {
    clearStoredApiKey();
    setApiKeyState(null);
  }

  async function send(text: string) {
    if (!client) return; // The gate should prevent this — no key, no send.

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    const history: Anthropic.MessageParam[] = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.text,
    }));
    setMessages((prev) => [...prev, userMessage]);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }]);
    setPending(true);

    try {
      const stream = client.messages.stream({
        model: 'claude-opus-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: history,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const chunk = event.delta.text;
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + chunk } : m)));
        }
      }
    } catch (err) {
      const message = err instanceof APIError ? apiErrorMessage(err) : 'Request failed.';
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: `Error: ${message}` } : m)));
    } finally {
      setPending(false);
    }
  }

  return { messages, pending, send, hasApiKey: Boolean(apiKey), setApiKey, clearApiKey };
}
