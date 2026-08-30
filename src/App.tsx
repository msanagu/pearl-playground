import { useMemo, useState } from 'react';
import { Stack, Row, Text, Button, Card, color, fontFamily } from '@msanagu/pearl';
import { ChatPanel, type PanelSide } from './ChatPanel';
import { useAssistant } from './useAssistant';
import { CanvasPreview } from './CanvasPreview';
import { extractCodeBlock } from './extractCodeBlock';
import { THEMES, THEME_NAMES, themeClassName, type ThemeName } from './themeRegistry';

/**
 * Two regions, deliberately separated: the canvas (generated content lives
 * here) and the assistant panel (fixed app chrome — see ChatPanel). Nothing
 * in canvas should ever be mistaken for the tool operating on it, and vice
 * versa. Which side the panel docks to is owned here, not in ChatPanel,
 * since it decides sibling order in this layout.
 *
 * Theme state also lives here (not in main.tsx) since the switcher needs to
 * change it at runtime — the themed wrapper that used to be static in
 * main.tsx moved here as a result. One theme drives everything: the visual
 * theme of the whole canvas AND which theme the assistant is scoped to (see
 * useAssistant/systemPrompt.ts) — asking about a role while the canvas is
 * rendering a different theme would be exactly the confusion a switcher is
 * supposed to prevent.
 */
function App() {
  const [themeName, setThemeName] = useState<ThemeName>('pearl');
  const assistant = useAssistant(themeName);
  const [side, setSide] = useState<PanelSide>('left');

  const lastAssistantMessage = [...assistant.messages].reverse().find((m) => m.role === 'assistant');
  const generatedCode = useMemo(() => (lastAssistantMessage ? extractCodeBlock(lastAssistantMessage.text) : null), [lastAssistantMessage]);

  const canvas = (
    <div style={{ flex: 1, overflowY: 'auto', background: color.background }}>
      <Stack gap="xl" style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
        <Row justify="between" align="center">
          <Text typeScale="displaySm" as="h1">
            Pearl Playground
          </Text>
          <select value={themeName} onChange={(e) => setThemeName(e.target.value as ThemeName)} aria-label="Canvas theme" style={{ font: 'inherit', padding: '6px 10px' }}>
            {THEME_NAMES.map((name) => (
              <option key={name} value={name}>
                {THEMES[name].label}
              </option>
            ))}
          </select>
        </Row>

        {generatedCode ? (
          <CanvasPreview code={generatedCode} />
        ) : (
          <>
            <Text typeScale="bodyLg" prominence="subtle">
              Ask the assistant to generate a component — it'll render here, live.
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
          </>
        )}
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
    <div className={themeClassName(themeName, 'light')} style={{ color: color.text, background: color.background, fontFamily: fontFamily.body, minHeight: '100vh' }}>
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
    </div>
  );
}

export default App;
