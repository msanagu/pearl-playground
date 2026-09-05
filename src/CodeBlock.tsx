import { Highlight, type PrismTheme } from 'prism-react-renderer';
import type { Ref } from 'react';
import './codeBlock.css';

/**
 * A Material-ish dark palette, inlined rather than pulled from
 * `prism-react-renderer`'s bundled themes so the token colours stay in sync
 * with the one `#18181b` ground defined in codeBlock.css — the themes ship
 * their own background, and we never want prism picking the surface colour.
 */
const THEME: PrismTheme = {
  plain: { color: '#e4e4e7', backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#6b7280', fontStyle: 'italic' } },
    { types: ['punctuation'], style: { color: '#89ddff' } },
    { types: ['property', 'tag', 'symbol', 'deleted'], style: { color: '#f07178' } },
    { types: ['boolean', 'number', 'constant'], style: { color: '#f78c6c' } },
    { types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'], style: { color: '#c3e88d' } },
    { types: ['operator', 'entity', 'url'], style: { color: '#89ddff' } },
    { types: ['atrule', 'attr-value', 'keyword'], style: { color: '#c792ea' } },
    { types: ['function', 'class-name'], style: { color: '#82aaff' } },
    { types: ['regex', 'important', 'variable'], style: { color: '#ffcb6b' } },
  ],
};

interface CodeBlockProps {
  code: string;
  /** Any prism-supported grammar name; falls back to plain text when unknown. */
  language?: string;
  /** Extra class on the <pre> — the host stylesheet layers context tweaks on it. */
  className?: string;
  /** Forwarded to the <pre> so callers can keep it scrolled (streaming view). */
  preRef?: Ref<HTMLPreElement>;
}

export function CodeBlock({ code, language = 'tsx', className, preRef }: CodeBlockProps) {
  return (
    <Highlight code={code.replace(/\n$/, '')} language={language} theme={THEME}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className={className ? `code-block ${className}` : 'code-block'} ref={preRef}>
          <code>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}
