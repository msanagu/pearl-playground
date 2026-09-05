import { useMemo, useState } from 'react';
import { TbSun, TbMoon, TbEye, TbCode } from 'react-icons/tb';
import { Stack, Row, Text, Button, Card, Alert, color, fontFamily, space } from '@msanagu/pearl';
import { ChatPanel, type PanelSide } from './ChatPanel';
import { useAssistant } from './useAssistant';
import { CanvasPreview } from './CanvasPreview';
import { extractCodeBlock } from './extractCodeBlock';
import { THEMES, THEME_NAMES, themeClassName, systemMode, type ThemeName } from './themeRegistry';
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
  // Mode follows the user, not the theme: seeded once from the OS
  // preference, then only a manual toggle changes it. Switching themes
  // leaves it alone.
  const [mode, setMode] = useState(systemMode);
  const assistant = useAssistant(themeName);
  const [side, setSide] = useState<PanelSide>('left');
  const [showCode, setShowCode] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  // The select starts on its own "Select theme" placeholder rather than
  // showing "Pearl" pre-picked — themeName still defaults to 'pearl'
  // underneath so nothing renders unstyled before a real choice is made;
  // this only tracks whether the user has actually interacted with it yet.
  const [themeChosen, setThemeChosen] = useState(false);

  const lastAssistantMessage = [...assistant.messages].reverse().find((m) => m.role === 'assistant');
  const generatedCode = useMemo(() => (lastAssistantMessage ? extractCodeBlock(lastAssistantMessage.text) : null), [lastAssistantMessage]);

  // Generated content gets the canvas's full width — a page or dashboard
  // someone asks for shouldn't be squeezed into the empty-state's narrow
  // reading column. The 640px cap only applies to that empty state itself
  // (prose + a demo card genuinely read better narrow).
  const canvas = (
    <div style={{ flex: 1, overflowY: 'auto', background: color.background }}>
      {generatedCode ? (
        <div style={{ padding: space.lg }}>
          <CanvasPreview code={generatedCode} showCode={showCode} />
        </div>
      ) : (
        <Stack gap="xl" style={{ padding: space.lg, maxWidth: 640, margin: '0 auto' }}>
          {showAlert && (
            <Alert variant="info" onDismiss={() => setShowAlert(false)}>
              Ask the assistant to generate a component — it'll render here, live.
            </Alert>
          )}
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
      )}
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
      onShowCode={() => setShowCode(true)}
    />
  );

  return (
    <div className={themeClassName(themeName, mode)} style={{ color: color.text, fontFamily: fontFamily.body, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-bar">
        <div className="app-bar-title">Pearl Playground</div>
        <div className="app-bar-right">
          {generatedCode && (
            <button
              type="button"
              role="switch"
              aria-checked={showCode}
              aria-label={showCode ? 'Showing code — switch to preview' : 'Showing preview — switch to code'}
              className="view-toggle"
              onClick={() => setShowCode(!showCode)}
            >
              <span className={`view-toggle-thumb${showCode ? ' view-toggle-thumb--right' : ''}`} />
              <TbEye size={15} className={`view-toggle-icon${!showCode ? ' view-toggle-icon--active' : ''}`} />
              <TbCode size={15} className={`view-toggle-icon${showCode ? ' view-toggle-icon--active' : ''}`} />
            </button>
          )}
          <button
            type="button"
            className="app-bar-icon-button"
            onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
            aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {mode === 'light' ? <TbMoon size={16} /> : <TbSun size={16} />}
          </button>
          <select
            className="app-bar-theme-select"
            value={themeChosen ? themeName : ''}
            onChange={(e) => {
              const next = e.target.value as ThemeName;
              setThemeName(next);
              setThemeChosen(true);
            }}
            aria-label="Canvas theme"
          >
            <option value="" disabled>
              Select theme
            </option>
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
