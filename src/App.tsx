import { Stack, Row, Text, Button, Card } from '@msanagu/pearl';

/**
 * Smoke test only — proves `@msanagu/pearl` renders correctly from a real
 * npm install (tarball, not a symlink) before this becomes a vibe-coding
 * playground. Replace once that phase starts.
 */
function App() {
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
    </Stack>
  );
}

export default App;
