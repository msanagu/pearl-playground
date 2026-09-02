import { useState } from 'react';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as React from 'react';
import { TbCopy, TbCheck } from 'react-icons/tb';
import { PiCheck, PiX, PiCaretDown, PiCaretRight, PiArrowRight, PiWarningCircle, PiInfo, PiStar, PiHeart, PiUser } from 'react-icons/pi';
import { Button, Text, Stack, Row, Card, Input, Field, Icon, Alert, Tag, Link, color, radius, space, controlHeight, fontFamily, fontWeight } from '@msanagu/pearl';
import { toDisplaySnippets } from './toDisplayCode';
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
  const copyText = cssFile ? `// Feature.css.ts\n${cssFile}\n// Feature.tsx\n${componentFile}` : componentFile;

  return (
    <LiveProvider code={code} scope={SCOPE} noInline>
      <LiveError className="canvas-preview-error" />

      {showCode ? (
        <div className="canvas-preview-code-wrap">
          <div className="canvas-preview-code-toolbar">
            <CopyButton code={copyText} />
          </div>
          {cssFile && (
            <>
              <div className="canvas-preview-code-label">Feature.css.ts</div>
              <pre className="canvas-preview-code">
                <code>{cssFile}</code>
              </pre>
            </>
          )}
          <div className="canvas-preview-code-label">Feature.tsx</div>
          <pre className="canvas-preview-code">
            <code>{componentFile}</code>
          </pre>
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

function CopyButton({ code }: { code: string }) {
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

  return (
    <button type="button" className="canvas-preview-copy-button" onClick={handleClick} aria-label={state === 'failed' ? 'Copy failed — clipboard access denied' : 'Copy code'}>
      {state === 'copied' ? <TbCheck size={14} /> : <TbCopy size={14} />}
    </button>
  );
}
