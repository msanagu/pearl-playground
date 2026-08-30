import { useMemo, useState } from 'react';
import { Stack, Row, Text, Button, Card, color, fontFamily } from '@msanagu/pearl';
import { ChatPanel, type PanelSide } from './ChatPanel';
import { useAssistant } from './useAssistant';
import { CanvasPreview } from './CanvasPreview';
import { extractCodeBlock } from './extractCodeBlock';
import { THEMES, THEME_NAMES, themeClassName, type ThemeName, type ThemeMode } from './themeRegistry';
import './appBar.css';

/**
 * Three regions: a full-width top app bar (real app chrome — title, theme
 * switcher; see appBar.css), and below it the canvas (generated content)
 * and the assistant panel (docked chrome — see ChatPanel), side by side.
 * The theme switcher lives in the bar, not inside the canvas's own content
 * area, for the same reason ChatPanel is styled separately from Pearl's
 * tokens — it's the tool operating on the workspace, not something a
 * generated component could ever produce, so it must never read as part of
 * whatever the canvas happens to be showing.
 *
 * Theme state lives here since the switcher needs to change it at runtime.
 * One theme drives everything: the visual theme of the whole canvas AND
 * which theme the assistant is scoped to (see useAssistant/systemPrompt.ts).
 */
function App() {
  const [themeName, setThemeName] = useState<ThemeName>('pearl');
  const [mode, setMode] = useState<ThemeMode>('light');
  const assistant = useAssistant(themeName);
  const [side, setSide] = useState<PanelSide>('left');
  const [showCode, setShowCode] = useState(false);

  const lastAssistantMessage = [...assistant.messages].reverse().find((m) => m.role === 'assistant');
  const generatedCode = useMemo(() => (lastAssistantMessage ? extractCodeBlock(lastAssistantMessage.text) : null), [lastAssistantMessage]);

  const canvas = (
    <div style={{ flex: 1, overflowY: 'auto', background: color.background }}>
      <Stack gap="xl" style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
        {generatedCode ? (
          <CanvasPreview code={generatedCode} showCode={showCode} />
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
    <div className={themeClassName(themeName, mode)} style={{ color: color.text, fontFamily: fontFamily.body, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-bar">
        <div className="app-bar-title">Pearl Playground</div>
        <div className="app-bar-right">
          {generatedCode && (
            <div className="app-bar-tabs" role="group" aria-label="View">
              <button type="button" className={`app-bar-tab${!showCode ? ' app-bar-tab--active' : ''}`} onClick={() => setShowCode(false)}>
                Preview
              </button>
              <button type="button" className={`app-bar-tab${showCode ? ' app-bar-tab--active' : ''}`} onClick={() => setShowCode(true)}>
                Code
              </button>
            </div>
          )}
          <div className="app-bar-tabs" role="group" aria-label="Mode">
            <button type="button" className={`app-bar-tab${mode === 'light' ? ' app-bar-tab--active' : ''}`} onClick={() => setMode('light')}>
              Light
            </button>
            <button type="button" className={`app-bar-tab${mode === 'dark' ? ' app-bar-tab--active' : ''}`} onClick={() => setMode('dark')}>
              Dark
            </button>
          </div>
          <select className="app-bar-theme-select" value={themeName} onChange={(e) => setThemeName(e.target.value as ThemeName)} aria-label="Canvas theme">
            {THEME_NAMES.map((name) => (
              <option key={name} value={name}>
                {THEMES[name].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Row style={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
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
