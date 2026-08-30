import { useState } from 'react';
import { Stack, Row, Text, Button, Card, color } from '@msanagu/pearl';
import { ChatPanel } from './ChatPanel';
import type { ChatMessage } from './ChatMessage';

/**
 * Two regions, deliberately separated: the canvas (left, generated content
 * lives here) and the assistant panel (right, fixed app chrome — see
 * ChatPanel). Nothing in canvas should ever be mistaken for the tool
 * operating on it, and vice versa.
 */
function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  function handleSend(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), text }]);
  }

  return (
    <Row style={{ minHeight: '100vh', alignItems: 'stretch' }}>
      <div style={{ flex: 1, overflowY: 'auto', background: color.background }}>
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
        </Stack>
      </div>

      <ChatPanel messages={messages} onSend={handleSend} />
    </Row>
  );
}

export default App;
