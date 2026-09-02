const CODE_FENCE_RE = /```(?:tsx|jsx)\n([\s\S]*?)```/g;

/** Marker `stripCodeBlocks` leaves in place of a fenced block — ChatPanel splits on this to render an actual "view code" button instead of the placeholder prose. */
export const SHOW_CODE_MARKER = '%%SHOW_CODE_BUTTON%%';

/** Extracts the last ```tsx / ```jsx fenced code block from markdown text — see systemPrompt.ts's "Generation format" section for why there's ever only one that matters. */
export function extractCodeBlock(markdown: string): string | null {
  const matches = [...markdown.matchAll(CODE_FENCE_RE)];
  const last = matches.at(-1);
  return last ? last[1].trim() : null;
}

/**
 * Removes ```tsx/```jsx fences from a message's displayed text — the code
 * already renders in CanvasPreview's own Code tab (see App.tsx), so showing
 * it a second time in the chat thread is pure redundancy, not redundancy as
 * a safety net. Per the generation-format contract only these two fence
 * types ever appear in an assistant message, so this is safe to apply
 * unconditionally rather than needing to know which message "is" the
 * generation one.
 *
 * Leaves `SHOW_CODE_MARKER` in the fence's place rather than prose, so the
 * caller can swap it for a real "view code" button instead of just telling
 * the user where to look.
 */
export function stripCodeBlocks(markdown: string): string {
  return markdown.replace(CODE_FENCE_RE, SHOW_CODE_MARKER).trim();
}

const OPEN_FENCE_RE = /```(?:tsx|jsx)\n/g;

/**
 * While a response is still streaming, an opening ```tsx/```jsx fence can
 * arrive with no closing fence yet — `CODE_FENCE_RE` requires both, so
 * `stripCodeBlocks` leaves that whole, ever-growing partial block as raw text
 * in the message. Splits it out so the caller can render it in its own
 * bounded, scrollable "Generating" box instead — same idea as the Thinking
 * block, not meant to be read exhaustively while it's still arriving.
 *
 * Returns `partialCode: null` when there's no unclosed fence (nothing to
 * split out — either no code block yet, or the last one already closed).
 */
export function splitStreamingCode(markdown: string): { prose: string; partialCode: string | null } {
  const closedCount = [...markdown.matchAll(CODE_FENCE_RE)].length;
  const opens = [...markdown.matchAll(OPEN_FENCE_RE)];
  const lastOpen = opens.at(-1);
  if (!lastOpen || opens.length <= closedCount) return { prose: markdown, partialCode: null };

  const fenceStart = lastOpen.index ?? 0;
  return { prose: markdown.slice(0, fenceStart).trim(), partialCode: markdown.slice(fenceStart + lastOpen[0].length) };
}
