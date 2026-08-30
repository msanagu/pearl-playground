import { useState, type FormEvent } from 'react';

interface ApiKeyGateProps {
  onSubmit: (key: string) => void;
}

/**
 * Blocks the assistant (not the rest of the app — the canvas works
 * regardless) until the visitor supplies their own Anthropic API key.
 * Nothing here sends the key anywhere but into this browser's own
 * localStorage (see apiKeyStore.ts) — this is a client-only app, no backend
 * exists to hold a shared key safely, so BYOK is the only honest option.
 */
export function ApiKeyGate({ onSubmit }: ApiKeyGateProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="chrome-gate">
      <div className="chrome-gate-title">Use your own Claude API key</div>
      <p className="chrome-gate-text">
        This assistant runs entirely in your browser — there's no backend. To use it, paste your own Anthropic API key below.
      </p>
      <ul className="chrome-gate-list">
        <li>Stored only in this browser's local storage — never sent to us or any server we control.</li>
        <li>Requests go directly from your browser to Anthropic's API.</li>
        <li>Usage is billed to your own Anthropic account. You're responsible for any cost incurred.</li>
        <li>
          Don't paste a key you don't control. Consider setting a spending limit on it in the{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
            Anthropic Console
          </a>
          .
        </li>
      </ul>
      <form onSubmit={handleSubmit} className="chrome-gate-form">
        <input
          type="password"
          className="chrome-gate-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-ant-…"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="chrome-gate-submit" disabled={!value.trim()}>
          Save key
        </button>
      </form>
    </div>
  );
}
