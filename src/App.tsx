import { useState } from 'react';
import { Stack, Row, Text, Button, Card, color } from '@msanagu/pearl';
import { ChatPanel, type PanelSide } from './ChatPanel';
import { useAssistant } from './useAssistant';

/**
 * Two regions, deliberately separated: the canvas (generated content lives
 * here) and the assistant panel (fixed app chrome — see ChatPanel). Nothing
 * in canvas should ever be mistaken for the tool operating on it, and vice
 * versa. Which side the panel docks to is owned here, not in ChatPanel,
 * since it decides sibling order in this layout.
 */
function App() {
  const assistant = useAssistant();
  const [side, setSide] = useState<PanelSide>('left');

  const canvas = (
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
  );

  const panel = (
    <ChatPanel
      messages={assistant.messages}
      pending={assistant.pending}
      hasApiKey={assistant.hasApiKey}
      side={side}
      onSideChange={setSide}
      onSend={assistant.send}
      onSetApiKey={assistant.setApiKey}
      onClearApiKey={assistant.clearApiKey}
    />
  );

  return (
    <Row style={{ minHeight: '100vh', alignItems: 'stretch' }}>
      {side === 'left' ? (
        <>
          {panel}
          {canvas}
        </>
      ) : (
        <>
          {canvas}
          {panel}
        </>
      )}
    </Row>
  );
}

export default App;
