import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse, TbArrowUp } from 'react-icons/tb';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from './ChatMessage';
import { ApiKeyGate } from './ApiKeyGate';
import './chrome.css';

export type PanelSide = 'left' | 'right';

interface ChatPanelProps {
  messages: ChatMessage[];
  pending: boolean;
  hasApiKey: boolean;
  side: PanelSide;
  onSideChange: (side: PanelSide) => void;
  onSend: (text: string) => void;
  onSetApiKey: (key: string) => void;
  onClearApiKey: () => void;
}

const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

/**
 * Docked app chrome, not canvas content — the tool operating on the
 * workspace, never something the workspace itself could generate. Styled
 * from chrome.css (a token layer shaped like Pearl's own, but not Pearl —
 * see that file's header), so it can never be mistaken for Pearl output
 * regardless of the canvas theme.
 *
 * Closable and drag-resizable so the full canvas is reachable at any time —
 * collapsing renders only a fixed-position reopen button (out of flex flow),
 * so the canvas's `flex: 1` fills the freed width automatically. Which edge
 * it docks to is owned by the parent (`side`/`onSideChange`) since that
 * decides sibling order in the layout, not just this component's own styles.
 *
 * Without an API key, the message list/composer are replaced by ApiKeyGate —
 * the rest of the app (canvas) works regardless; only the assistant itself
 * is gated.
 */
export function ChatPanel({ messages, pending, hasApiKey, side, onSideChange, onSend, onSetApiKey, onClearApiKey }: ChatPanelProps) {
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const draggingRef = useRef(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      // Dragging the handle measures distance from whichever screen edge
      // the panel is docked to — the opposite edge from a right-docked panel.
      const next = side === 'right' ? window.innerWidth - e.clientX : e.clientX;
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
  }, [side]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages]);

  if (!open) {
    return (
      <button type="button" className="chrome-reopen-button" style={{ [side]: 16 } as React.CSSProperties} onClick={() => setOpen(true)}>
        {side === 'left' ? <TbLayoutSidebarLeftCollapse size={15} /> : <TbLayoutSidebarRightCollapse size={15} />}
        Pearl Assistant
      </button>
    );
  }

  return (
    <div className={`chrome-panel chrome-panel--${side}`} style={{ width }}>
      <div
        className="chrome-resize-handle"
        onMouseDown={(e) => {
          e.preventDefault(); // otherwise the drag also starts a native text selection
          draggingRef.current = true;
        }}
      />

      <div className="chrome-header">
        <div className="chrome-side-toggle" role="group" aria-label="Dock assistant panel to">
          <button
            type="button"
            className={`chrome-side-button${side === 'left' ? ' chrome-side-button--active' : ''}`}
            onClick={() => onSideChange('left')}
            aria-label="Dock to left"
            aria-pressed={side === 'left'}
          >
            <TbLayoutSidebarLeftCollapse size={16} />
          </button>
          <button
            type="button"
            className={`chrome-side-button${side === 'right' ? ' chrome-side-button--active' : ''}`}
            onClick={() => onSideChange('right')}
            aria-label="Dock to right"
            aria-pressed={side === 'right'}
          >
            <TbLayoutSidebarRightCollapse size={16} />
          </button>
        </div>
        <div className="chrome-label">
          Pearl Assistant
        </div>
        <div className="chrome-header-actions">
          {hasApiKey && (
            <button type="button" className="chrome-text-button" onClick={onClearApiKey}>
              Remove key
            </button>
          )}
          <button type="button" className="chrome-close-button" onClick={() => setOpen(false)} aria-label="Close assistant panel">
            ×
          </button>
        </div>
      </div>

      {hasApiKey ? (
        <>
          <div className="chrome-messages" ref={messagesRef}>
            {messages.map((m) => (
              <div className={`chrome-message chrome-message--${m.role}`} key={m.id}>
                {m.role === 'assistant' ? (
                  m.text ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  ) : (
                    pending && '…'
                  )
                ) : (
                  m.text
                )}
              </div>
            ))}
          </div>
          <PanelInput onSend={onSend} disabled={pending} />
        </>
      ) : (
        <ApiKeyGate onSubmit={onSetApiKey} />
      )}
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
    <form onSubmit={handleSubmit} className="chrome-composer">
      <textarea
        className="chrome-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about the design system, or describe UI to generate…"
        rows={2}
        disabled={disabled}
      />
      <div className="chrome-composer-footer">
        <button type="submit" className="chrome-send-button" disabled={disabled || !value.trim()} aria-label="Send">
          <TbArrowUp size={16} />
        </button>
      </div>
    </form>
  );
}
