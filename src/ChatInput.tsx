import { useState, type FormEvent } from 'react';
import { Field, Input, Button, Row } from '@msanagu/pearl';

export interface ChatMessage {
  id: string;
  text: string;
}

interface ChatInputProps {
  onSend: (text: string) => void;
}

/**
 * The input itself — no model call wired up yet. `onSend` is the seam
 * where a real LLM request lands once that phase starts.
 */
export function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <Row gap="sm" align="end">
        <div style={{ flex: 1 }}>
          <Field label="Message">
            {(injected) => (
              <Input
                {...injected}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Describe the UI you want…"
                autoComplete="off"
              />
            )}
          </Field>
        </div>
        <Button type="submit" variant="primary">
          Send
        </Button>
      </Row>
    </form>
  );
}
