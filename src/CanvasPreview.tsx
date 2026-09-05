import { useState } from 'react';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as React from 'react';
import { TbCopy, TbCheck } from 'react-icons/tb';
import { PiCheck, PiX, PiCaretDown, PiCaretRight, PiArrowRight, PiWarningCircle, PiInfo, PiStar, PiHeart, PiUser } from 'react-icons/pi';
import { Button, Text, Stack, Row, Card, Input, Field, Icon, Alert, Tag, Link, color, radius, space, controlHeight, fontFamily, fontWeight } from '@msanagu/pearl';
import { toDisplaySnippets } from './toDisplayCode';
import { CodeBlock } from './CodeBlock';
import './canvasPreview.css';

// Everything a generated code block is allowed to reference — matches
// systemPrompt.ts's "Generation format" instructions exactly. If a name is
// added there, it must be added here too, or the live render throws
// "X is not defined" instead of working.
//
// Icon's real prop is `icon={SomeIconComponent}` (react-icons), not a name
// string — since generated code can't import anything, it can only use
// Icon meaningfully if we hand it real icon components to reference. This
// curated set is what the system prompt promises exists; adding an icon
// here means adding it there too, and vice versa.
const SCOPE = {
  React,
  Button,
  Text,
  Stack,
  Row,
  Card,
  Input,
  Field,
  Icon,
  Alert,
  Tag,
  Link,
  color,
  radius,
  space,
  controlHeight,
  fontFamily,
  fontWeight,
  PiCheck,
  PiX,
  PiCaretDown,
  PiCaretRight,
  PiArrowRight,
  PiWarningCircle,
  PiInfo,
  PiStar,
  PiHeart,
  PiUser,
};

interface CanvasPreviewProps {
  code: string;
  /** Owned by App.tsx — the Preview/Code toggle lives in the app bar, not here. */
  showCode: boolean;
}

/**
 * Renders generated code live, in-browser, via react-live (Babel-standalone
 * JSX transform + eval in a controlled scope — no bundler, no server). The
 * scope above is the entire trust boundary: no import statements are
 * evaluated, so a generated component can only ever touch what's listed
 * there, not arbitrary modules.
 */
export function CanvasPreview({ code, showCode }: CanvasPreviewProps) {
  // Display-only: react-live below still evaluates the original sandbox
  // `code` (no imports, inline `<style>`) exactly as-is — this is purely
  // what the Code tab shows and what the copy button copies, reshaped into
  // what you'd actually paste into a real Pearl codebase.
  const { cssFile, componentFile } = showCode ? toDisplaySnippets(code) : { cssFile: null, componentFile: code };

  // One entry per distinct file the generation produced — `Feature.tsx`
  // always, plus `Feature.css.ts` only when there was a `<style>` block to
  // extract. The summary heading below names every entry so "Copy all"
  // never silently pulls in a file the user didn't know was there.
  const files = [
    ...(cssFile ? [{ name: 'Feature.css.ts', code: cssFile }] : []),
    { name: 'Feature.tsx', code: componentFile },
  ];
  const multiFile = files.length > 1;
  const copyAllText = files.map((f) => `// ${f.name}\n${f.code}`).join('\n\n');

  return (
    <LiveProvider code={code} scope={SCOPE} noInline>
      <LiveError className="canvas-preview-error" />

      {showCode ? (
        <div className="canvas-preview-code-wrap">
          <div className="canvas-preview-code-summary">
            <span className="canvas-preview-code-count">
              {multiFile ? `${files.length} files` : '1 file'} · {files.map((f) => f.name).join(', ')}
            </span>
            <CopyButton
              code={multiFile ? copyAllText : files[0].code}
              variant="labeled"
              label={multiFile ? 'Copy all' : 'Copy'}
              copiedLabel={multiFile ? `Copied ${files.length} files` : `Copied ${files[0].name}`}
            />
          </div>
          {files.map((f) => (
            <div className="canvas-preview-code-file" key={f.name}>
              <div className="canvas-preview-code-label">
                <span>{f.name}</span>
                {multiFile && <CopyButton code={f.code} variant="icon" copiedLabel={`Copied ${f.name}`} />}
              </div>
              <CodeBlock code={f.code} language="tsx" />
            </div>
          ))}
        </div>
      ) : (
        // No wrapping box — LivePreview's output sits directly on the
        // canvas's own app background, the way a real page would, not
        // inside a second "preview frame". Whatever boundary the generated
        // component itself has (a Card's own border, a page's own
        // container) is the only one that shows.
        <LivePreview />
      )}
    </LiveProvider>
  );
}

/**
 * `variant="labeled"` shows its `label` at rest (the summary-row "Copy all");
 * `variant="icon"` is icon-only at rest (the per-file button on a filename
 * row). Both swap to `copiedLabel` text on success — so a per-file copy still
 * confirms *which* file it took ("Copied Feature.css.ts"), not just a
 * checkmark that leaves the user guessing.
 */
function CopyButton({
  code,
  variant = 'icon',
  label,
  copiedLabel = 'Copied',
}: {
  code: string;
  variant?: 'labeled' | 'icon';
  label?: string;
  copiedLabel?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(code);
      setState('copied');
    } catch {
      // Clipboard access can be denied by the browser's permission policy —
      // nothing this code can fix, so fail visibly instead of throwing an
      // unhandled rejection.
      setState('failed');
    }
    setTimeout(() => setState('idle'), 1500);
  }

  const text = state === 'copied' ? copiedLabel : state === 'failed' ? 'Copy failed' : label;

  return (
    <button
      type="button"
      className={`canvas-preview-copy-button canvas-preview-copy-button--${variant}${state !== 'idle' ? ' canvas-preview-copy-button--feedback' : ''}${state === 'copied' ? ' canvas-preview-copy-button--copied' : ''}`}
      onClick={handleClick}
      aria-label={state === 'failed' ? 'Copy failed — clipboard access denied' : label ?? 'Copy code'}
    >
      {state === 'copied' ? <TbCheck size={14} /> : <TbCopy size={14} />}
      {text && <span className="canvas-preview-copy-text">{text}</span>}
    </button>
  );
}
