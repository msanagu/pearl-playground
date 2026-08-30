/** Extracts the last ```tsx / ```jsx fenced code block from markdown text — see systemPrompt.ts's "Generation format" section for why there's ever only one that matters. */
export function extractCodeBlock(markdown: string): string | null {
  const matches = [...markdown.matchAll(/```(?:tsx|jsx)\n([\s\S]*?)```/g)];
  const last = matches.at(-1);
  return last ? last[1].trim() : null;
}
