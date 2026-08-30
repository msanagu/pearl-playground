import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage } from './ChatMessage';
import './chrome.css';

interface ChatPanelProps {
  messages: ChatMessage[];
  pending: boolean;
  hasApiKey: boolean;
  onSend: (text: string) => void;
}

const DEFAULT_WIDTH = 340;
const MIN_WIDTH = 260;
const MAX_WIDTH = 600;

/**
 * Docked app chrome, not canvas content — the tool operating on the
 * workspace, never something the workspace itself could generate. Styled
 * from chrome.css, deliberately not any @msanagu/pearl token/component, so
 * it can never be mistaken for Pearl output regardless of the canvas theme.
 *
 * Closable and drag-resizable so the full canvas is reachable at any time —
 * collapsing renders only a fixed-position reopen button (out of flex flow),
 * so the canvas's `flex: 1` fills the freed width automatically.
 */
export function ChatPanel({ messages, pending, hasApiKey, onSend }: ChatPanelProps) {
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const draggingRef = useRef(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const next = window.innerWidth - e.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
    }
    function onMouseUp() {
      draggingRef.current = false;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages]);

  if (!open) {
    return (
      <button type="button" className="chrome-reopen-button" onClick={() => setOpen(true)}>
        Open Pearl Assistant
      </button>
    );
  }

  return (
    <div className="chrome-panel" style={{ width }}>
      <div className="chrome-resize-handle" onMouseDown={() => (draggingRef.current = true)} />

      <div className="chrome-header">
        <div className="chrome-label">
          Pearl Assistant{!hasApiKey && ' · no API key set'}
        </div>
        <button type="button" className="chrome-close-button" onClick={() => setOpen(false)} aria-label="Close assistant panel">
          ×
        </button>
      </div>

      <div className="chrome-messages" ref={messagesRef}>
        {messages.map((m) => (
          <div className={`chrome-message chrome-message--${m.role}`} key={m.id}>
            {m.text || (pending && m.role === 'assistant' ? '…' : '')}
          </div>
        ))}
      </div>

      <PanelInput onSend={onSend} disabled={pending} />
    </div>
  );
}

function PanelInput({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) {
  const [value, setValue] = useState('');

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  // Enter sends, Shift+Enter inserts a newline — the standard chat-input
  // convention, since a bare <textarea> would otherwise treat Enter as
  // "new line" with no way to send from the keyboard.
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="chrome-input-row">
      <textarea
        className="chrome-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about the design system, or describe UI to generate… (Shift+Enter for a new line)"
        rows={2}
        disabled={disabled}
      />
      <button type="submit" className="chrome-button" disabled={disabled}>
        {disabled ? '…' : 'Send'}
      </button>
    </form>
  );
}
