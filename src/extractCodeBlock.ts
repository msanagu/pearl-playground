const CODE_FENCE_RE = /```(?:tsx|jsx)\n([\s\S]*?)```/g;

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
 */
export function stripCodeBlocks(markdown: string): string {
  return markdown.replace(CODE_FENCE_RE, '_(shown in the Code tab above)_').trim();
}
