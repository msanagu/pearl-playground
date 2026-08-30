import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as React from 'react';
import { PiCheck, PiX, PiCaretDown, PiCaretRight, PiArrowRight, PiWarningCircle, PiInfo, PiStar, PiHeart, PiUser } from 'react-icons/pi';
import { Button, Text, Stack, Row, Card, Input, Field, Icon, Alert, Tag, Link, color, radius, space, controlHeight, fontFamily, fontWeight } from '@msanagu/pearl';
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
  return (
    <LiveProvider code={code} scope={SCOPE} noInline>
      <LiveError className="canvas-preview-error" />

      {showCode ? (
        <pre className="canvas-preview-code">
          <code>{code}</code>
        </pre>
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
