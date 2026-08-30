import { useState } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import { client, hasApiKey } from './anthropicClient';
import { buildSystemPrompt } from './systemPrompt';
import type { ChatMessage } from './ChatMessage';

const SYSTEM_PROMPT = buildSystemPrompt();

export function useAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);

  async function send(text: string) {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);

    if (!client) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'No API key set. Add VITE_ANTHROPIC_API_KEY to a .env.local file (git-ignored) and restart the dev server.',
        },
      ]);
      return;
    }

    const history: Anthropic.MessageParam[] = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.text,
    }));

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }]);
    setPending(true);

    try {
      const stream = client.messages.stream({
        model: 'claude-opus-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: history,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const chunk = event.delta.text;
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + chunk } : m)));
        }
      }
    } catch (err) {
      const message = err instanceof Anthropic.APIError ? err.message : 'Request failed.';
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: `Error: ${message}` } : m)));
    } finally {
      setPending(false);
    }
  }

  return { messages, pending, send, hasApiKey };
}
