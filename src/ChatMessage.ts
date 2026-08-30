export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Streamed reasoning summary (thinking_delta events) — assistant messages only, while the model is still working. */
  thinking?: string;
}
