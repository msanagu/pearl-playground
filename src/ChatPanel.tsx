import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse, TbArrowUp, TbCode } from 'react-icons/tb';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from './ChatMessage';
import { ApiKeyGate } from './ApiKeyGate';
import { stripCodeBlocks, splitStreamingCode, SHOW_CODE_MARKER } from './extractCodeBlock';
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
  onShowCode: () => void;
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
export function ChatPanel({ messages, pending, hasApiKey, side, onSideChange, onSend, onSetApiKey, onClearApiKey, onShowCode }: ChatPanelProps) {
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

  // Auto-follow only while the user is already at (or near) the bottom —
  // otherwise a streaming response force-scrolls them back down on every
  // chunk, fighting any attempt to scroll up and read something earlier.
  // `stickyRef` is written from real scroll events (both the user's and this
  // effect's own programmatic ones), so it reflects where they left off
  // rather than being recomputed from post-update layout, which would
  // already reflect the newly-grown content.
  const stickyRef = useRef(true);
  const STICK_THRESHOLD_PX = 48;

  useEffect(() => {
    if (stickyRef.current) {
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
    }
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
          <div
            className="chrome-messages"
            ref={messagesRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stickyRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
            }}
          >
            {messages.map((m, i) => {
              const isStreaming = pending && i === messages.length - 1;
              return (
                <div className={`chrome-message chrome-message--${m.role}`} key={m.id}>
                  {m.role === 'assistant' && m.thinking && (
                    <details className="chrome-thinking" open={isStreaming}>
                      <summary className="chrome-thinking-summary">{isStreaming && <TypingDots small />} Thinking</summary>
                      <div className="chrome-thinking-body">{m.thinking}</div>
                    </details>
                  )}
                  {m.role === 'assistant' ? (
                    m.text ? (
                      isStreaming ? (
                        <StreamingMessageBody text={m.text} />
                      ) : (
                        <MessageBody text={m.text} onShowCode={onShowCode} />
                      )
                    ) : (
                      isStreaming && !m.thinking && <TypingDots />
                    )
                  ) : (
                    m.text
                  )}
                </div>
              );
            })}
          </div>
          <PanelInput onSend={onSend} disabled={pending} />
        </>
      ) : (
        <ApiKeyGate onSubmit={onSetApiKey} />
      )}
    </div>
  );
}

/**
 * Renders an assistant message with `SHOW_CODE_MARKER` swapped for a real
 * button — clicking it jumps the canvas straight to the Code tab instead of
 * leaving the user to find the toggle in the app bar themselves.
 */
function MessageBody({ text, onShowCode }: { text: string; onShowCode: () => void }) {
  const segments = stripCodeBlocks(text).split(SHOW_CODE_MARKER);
  return (
    <>
      {segments.map((segment, i) => (
        <span key={i}>
          {segment && <ReactMarkdown remarkPlugins={[remarkGfm]}>{segment}</ReactMarkdown>}
          {i < segments.length - 1 && (
            <button type="button" className="chrome-show-code-button" onClick={onShowCode}>
              <TbCode size={14} />
              View generated code
            </button>
          )}
        </span>
      ))}
    </>
  );
}

/**
 * The streaming variant of a message body: an in-progress, not-yet-closed
 * code fence renders in its own bounded, self-scrolling "Generating" box —
 * same idea as the Thinking block (`.chrome-thinking-body`'s `max-height` +
 * `overflow-y`) — instead of as raw, ever-growing markdown text. That's what
 * was dragging the whole panel's scroll position down on every streamed
 * token: an unclosed fence never matches `stripCodeBlocks`' regex, so the
 * partial code rendered directly in the flow, growing the message (and with
 * it, the auto-scroll target) on every chunk.
 */
function StreamingMessageBody({ text }: { text: string }) {
  const { prose, partialCode } = splitStreamingCode(text);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    codeRef.current?.scrollTo({ top: codeRef.current.scrollHeight });
  }, [partialCode]);

  return (
    <>
      {prose && <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripCodeBlocks(prose).replaceAll(SHOW_CODE_MARKER, '')}</ReactMarkdown>}
      {partialCode !== null && (
        <div className="chrome-generating">
          <div className="chrome-generating-summary">
            <TypingDots small /> Generating
          </div>
          <pre className="chrome-generating-body" ref={codeRef}>
            <code>{partialCode}</code>
          </pre>
        </div>
      )}
    </>
  );
}

function TypingDots({ small }: { small?: boolean }) {
  return (
    <span className={`chrome-typing-dots${small ? ' chrome-typing-dots--small' : ''}`}>
      <span />
      <span />
      <span />
    </span>
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
