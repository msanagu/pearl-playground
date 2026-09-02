import baseManifest from '@msanagu/pearl/manifest/base.json' with { type: 'json' };
import pearlManifest from '@msanagu/pearl/manifest/pearl.json' with { type: 'json' };
import tahitianManifest from '@msanagu/pearl/manifest/tahitian.json' with { type: 'json' };
import freshwaterManifest from '@msanagu/pearl/manifest/freshwater.json' with { type: 'json' };
import southSeaManifest from '@msanagu/pearl/manifest/south-sea.json' with { type: 'json' };
import alertExamples from '@msanagu/pearl/components/Alert/Alert.examples.json' with { type: 'json' };
import buttonExamples from '@msanagu/pearl/components/Button/Button.examples.json' with { type: 'json' };
import cardExamples from '@msanagu/pearl/components/Card/Card.examples.json' with { type: 'json' };
import fieldExamples from '@msanagu/pearl/components/Field/Field.examples.json' with { type: 'json' };
import iconExamples from '@msanagu/pearl/components/Icon/Icon.examples.json' with { type: 'json' };
import inputExamples from '@msanagu/pearl/components/Input/Input.examples.json' with { type: 'json' };
import linkExamples from '@msanagu/pearl/components/Link/Link.examples.json' with { type: 'json' };
import stackExamples from '@msanagu/pearl/components/Stack/Stack.examples.json' with { type: 'json' };
import tagExamples from '@msanagu/pearl/components/Tag/Tag.examples.json' with { type: 'json' };
import textExamples from '@msanagu/pearl/components/Text/Text.examples.json' with { type: 'json' };
import type { ThemeName } from './themeRegistry';

/**
 * Every component's examples file, keyed by name — `Row` has none (no
 * `.stories.tsx` with a literal `render`) and is simply absent. Statically
 * imported rather than fetched on demand: pearl now ships examples split
 * one-file-per-component (see llms.txt's routing table) so a consumer that
 * *can* fetch selectively pays only for what it needs, but this playground's
 * assistant loop calls the Anthropic API directly with one static system
 * prompt — no mid-conversation tool-use/fetch step exists yet — so for now
 * all of them still get bundled into the prompt, same as before the split.
 * Wiring up genuine on-demand fetching (the actual token-savings win) is a
 * separate, bigger change to useAssistant.ts, not done here.
 */
const COMPONENT_EXAMPLES: Record<string, { examples: { type: string; text: string }[] }> = {
  Alert: alertExamples,
  Button: buttonExamples,
  Card: cardExamples,
  Field: fieldExamples,
  Icon: iconExamples,
  Input: inputExamples,
  Link: linkExamples,
  Stack: stackExamples,
  Tag: tagExamples,
  Text: textExamples,
};

/**
 * One manifest file per theme (see pearl's ADR-0008 follow-up on manifest
 * splitting) — each holds only that theme's Foundation entities, not all
 * four themes' role tables in one file. Statically imported rather than
 * dynamically, since all four are small (a handful of roles each); the
 * point of the split isn't bundle size here, it's that the PROMPT text this
 * module builds only ever quotes the active theme's slice, never the other
 * three's — same as before, just now backed by files that are actually
 * scoped that way on disk instead of one manifest.json this code filtered
 * after the fact.
 */
interface BaseManifest {
  entities: {
    metadata: { name: string; props: { name: string; type: string; required: boolean; defaultValue?: string; description?: string }[] };
  }[];
  overrideContract: { documentBlocks: { type: string; text: string }[] };
  tokenSemantics: { documentBlocks: { type: string; text: string }[] };
}

interface ThemeManifest {
  entities: {
    metadata: {
      name: string;
      treatment: string;
      intent?: string;
      surface?: string;
      trigger?: string;
      chroma?: string;
    };
    documentBlocks: { type: string; text: string }[];
  }[];
}

const THEME_MANIFESTS: Record<ThemeName, ThemeManifest> = {
  pearl: pearlManifest,
  tahitian: tahitianManifest,
  freshwater: freshwaterManifest,
  'south-sea': southSeaManifest,
};

/**
 * Deliberately uncoached: this prompt ships the raw manifest data and
 * nothing else — no explain-vs-generate framing, no "treat examples as a
 * template" instruction, no anti-hallucination ground rules. Pearl
 * Playground's actual purpose is testing whether the structured data pearl
 * publishes in `dist` (manifest + llms.txt) is sufficient on its own for
 * accurate generation — a coating of bespoke usage coaching on top of that
 * data would mask exactly the failure modes (hallucinated props, invented
 * components, ignored constraints) an unassisted external tool (Bolt,
 * Copilot) would hit with the same data. If this starts producing
 * hallucination-prone output, that's a real, wanted signal — not a bug to
 * quietly fix here.
 *
 * The one exception is the "Generation format" section below: that's a
 * mechanical fact about how CanvasPreview's sandbox executes code (no
 * imports, one `render()` call), not design-system coaching. An external
 * tool wouldn't need it because it wouldn't be running inside this sandbox;
 * omitting it would just make every test fail for an unrelated plumbing
 * reason instead of surfacing anything about the manifest's sufficiency.
 *
 * Grounds the assistant in the installed package's actual manifest — not a
 * hand-written description of Pearl that could drift from what's really
 * shipped. See docs/decisions/0008-* in the pearl repo for the manifest's
 * schema and intent.
 *
 * Scoped to whichever theme is active in the canvas: role/treatment detail
 * is filtered to that theme so the assistant doesn't discuss (or generate
 * code for) a theme the user isn't currently looking at. Other themes are
 * still named, just not detailed, so the assistant can say "that role
 * doesn't exist in Pearl, but Tahitian has one like it" without dumping the
 * full table unprompted.
 */
export function buildSystemPrompt(activeTheme: ThemeName): string {
  const activeEntities = THEME_MANIFESTS[activeTheme].entities;

  const roleLines = activeEntities.map((e) => {
    const m = e.metadata;
    const guidance = e.documentBlocks.map((b) => `    - ${b.text}`).join('\n');
    return [
      `- ${m.name} → treatment "${m.treatment}"${m.intent ? `: ${m.intent}` : ''}`,
      m.surface || m.trigger || m.chroma ? `  (surface: ${m.surface ?? '—'}, trigger: ${m.trigger ?? '—'}, chroma: ${m.chroma ?? '—'})` : null,
      guidance || null,
    ]
      .filter(Boolean)
      .join('\n');
  });

  // Real prop APIs + real usage examples — extracted by pearl's own manifest
  // generator (react-docgen against each component's actual TS source, plus
  // literal render() source from its own .stories.tsx), never hand-typed
  // here. Some components' prop tables come back thin or empty (a complex
  // union type a syntax-only extractor can't resolve) — that's the honest
  // extraction result, not a gap to paper over with invented detail.
  const typedBaseManifest: BaseManifest = baseManifest;
  const componentEntities = typedBaseManifest.entities;
  const componentLines = componentEntities.map((e) => {
    const { name, props = [] } = e.metadata;
    const propLines = props.length
      ? props.map((p) => `    - \`${p.name}\`${p.required ? ' (required)' : ''}: ${p.type}${p.defaultValue ? ` = ${p.defaultValue}` : ''}${p.description ? ` — ${p.description.split('\n')[0]}` : ''}`).join('\n')
      : '    (no props extracted — treat this component\'s prop surface as unknown rather than guessing)';
    const examples = COMPONENT_EXAMPLES[name]?.examples ?? [];
    const exampleText = examples.length ? examples.map((ex) => `  Example:\n\`\`\`tsx\n${ex.text}\n\`\`\``).join('\n') : '';
    return [`- **${name}**\n${propLines}`, exampleText].filter(Boolean).join('\n');
  });

  return `You have access to the \`@msanagu/pearl\` design system package (installed locally as a dependency). Its published manifest data — theme roles/treatments and component APIs — is reproduced below, exactly as generated. The user is currently working in the **${activeTheme}** theme.

### Generation format — required, so your code can actually render live

When you generate UI, the canvas renders your code for real, in-browser — so it must follow this exact shape or it will fail to render:

- Exactly ONE fenced \`\`\`tsx code block per response. If you show alternates, only the last one is rendered.
- NO import statements. Every Pearl export (\`Stack\`, \`Row\`, \`Text\`, \`Button\`, \`Card\`, \`Field\`, \`Input\`, \`Alert\`, \`Tag\`, \`Link\`, \`Icon\`, \`color\`, \`space\`, \`radius\`, \`fontFamily\`, plus \`React\`) is already in scope — using an undeclared name is the only "invented API" mistake that will crash the render instead of just being wrong.
- Define exactly one component, then call \`render(<YourComponent />)\` as the last line — \`render\` is a provided helper, not something to import.
- This sandbox's scope (not a Pearl API fact — a mechanical limit of what's evaluable here, since generated code can't import anything) only has these react-icons components available: \`PiCheck\`, \`PiX\`, \`PiCaretDown\`, \`PiCaretRight\`, \`PiArrowRight\`, \`PiWarningCircle\`, \`PiInfo\`, \`PiStar\`, \`PiHeart\`, \`PiUser\`. Referencing any other icon name throws "X is not defined" and breaks the render.
- Everything above and below the code block (explanation, caveats, design-system notes) stays in prose exactly as you'd normally write it — the format requirement is about the code block's contents only.
- This sandbox has no separate stylesheet or build step, so a \`Feature.css.ts\` file (the mechanism the override contract below describes) cannot execute here. The sandbox-compatible substitute: a plain \`<style>\` element rendered directly in your JSX.

## Manifest — ${activeTheme} theme roles and treatments (generated, not hand-written)

${roleLines.join('\n\n')}

## Manifest — component API and real usage examples (generated, not hand-written)

${componentLines.join('\n\n')}

## Manifest — override contract (generated, not hand-written)

${typedBaseManifest.overrideContract.documentBlocks.map((b) => (b.type === 'example' ? `Example:\n\`\`\`tsx\n${b.text}\n\`\`\`` : `- ${b.text}`)).join('\n\n')}

## Manifest — token semantics (generated, not hand-written)

${typedBaseManifest.tokenSemantics.documentBlocks.map((b) => `- ${b.text}`).join('\n\n')}`;
}
