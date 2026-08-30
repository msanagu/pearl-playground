import { useState } from 'react';
import { Stack, Row, Text, Button, Card } from '@msanagu/pearl';
import { ChatInput, type ChatMessage } from './ChatInput';

/**
 * Smoke test only — proves `@msanagu/pearl` renders correctly from a real
 * npm install (tarball, not a symlink) before this becomes a vibe-coding
 * playground. Replace once that phase starts.
 */
function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  function handleSend(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), text }]);
  }

  return (
    <Stack gap="xl" style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <Text typeScale="displaySm" as="h1">
        Pearl Playground
      </Text>
      <Text typeScale="bodyLg" prominence="subtle">
        Installed from a packed tarball, same as a real npm consumer — this page proves the components render correctly before anything gets built on top.
      </Text>
      <Card padding="lg">
        <Stack gap="md">
          <Text typeScale="headingSm" as="h2">
            Card
          </Text>
          <Text typeScale="bodyMd">A component rendered from the installed package, not the source repo.</Text>
          <Row gap="sm">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
          </Row>
        </Stack>
      </Card>

      <Card padding="lg">
        <Stack gap="md">
          <Text typeScale="headingSm" as="h2">
            Chat input
          </Text>
          <Text typeScale="bodyMd" prominence="subtle">
            No model wired up yet — sending just appends to this local list.
          </Text>
          <ChatInput onSend={handleSend} />
          {messages.length > 0 && (
            <Stack gap="xs" as="ul" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {messages.map((m) => (
                <Text as="li" typeScale="bodySm" key={m.id}>
                  {m.text}
                </Text>
              ))}
            </Stack>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

export default App;
