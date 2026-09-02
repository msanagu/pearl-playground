/**
 * Turns the sandbox's eval-only code (no imports, inline `<style>`, a
 * trailing `render(...)` call — required by CanvasPreview's react-live
 * scope, see systemPrompt.ts's "Generation format" section) into what a
 * developer would actually paste into a real Pearl codebase: real imports,
 * and a `Feature.css.ts` + `Feature.tsx` pair instead of an inline
 * `<style>` block — vanilla-extract's `style()` only runs inside a `.css.ts`
 * file (its Vite plugin extracts it at build time), so there's no version of
 * this that stays one file.
 *
 * This is a display-only, best-effort transform for the common shapes the
 * assistant actually generates (plain classes, `@media` blocks, a
 * `.parent .child` descendant override, a `base base--${expr}` modifier
 * lookup). Anything else falls through as a commented-out raw CSS block
 * rather than silently dropping it — never used for anything that executes.
 */

const PEARL_EXPORTS = ['Alert', 'Button', 'Card', 'Field', 'Icon', 'Input', 'Link', 'Row', 'Stack', 'Tag', 'Text', 'color', 'controlHeight', 'fontFamily', 'fontWeight', 'radius', 'space'];

interface ClassEntry {
  original: string;
  camel: string;
  base: Array<[string, string]>;
  media: Map<string, Array<[string, string]>>;
  pseudo: Map<string, Array<[string, string]>>;
}

interface DescendantOverride {
  parent: string;
  child: string;
  decls: Array<[string, string]>;
}

interface VariantGroup {
  prefix: string;
  camelPrefix: string;
  constName: string;
  members: Map<string, string>; // suffix -> camel class name
}

function kebabToCamel(s: string): string {
  return s.replace(/-+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase()).replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/** Strips `/* ... *\/` CSS comments — left in, they get swallowed into whatever selector/declaration the block-splitter is scanning at the time, since it has no comment awareness of its own. */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function extractStyleBlock(code: string): { css: string | null; withoutStyle: string } {
  const match = code.match(/[ \t]*<style>\{`([\s\S]*?)`\}<\/style>\n?/);
  if (!match) return { css: null, withoutStyle: code };
  return { css: stripCssComments(match[1]), withoutStyle: code.slice(0, match.index) + code.slice((match.index ?? 0) + match[0].length) };
}

/** Splits a CSS string into top-level `{selector, body}` blocks, brace-counting so nested `@media { ... }` bodies stay intact. */
function splitBlocks(css: string): Array<{ selector: string; body: string }> {
  const blocks: Array<{ selector: string; body: string }> = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;
    const selStart = i;
    while (i < css.length && css[i] !== '{') i++;
    const selector = css.slice(selStart, i).trim();
    if (!selector) break;
    i++; // consume '{'
    let depth = 1;
    const bodyStart = i;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    blocks.push({ selector, body: css.slice(bodyStart, i - 1) });
  }
  return blocks;
}

function parseDecls(body: string): Array<[string, string]> {
  return body
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const idx = d.indexOf(':');
      if (idx === -1) return null;
      return [kebabToCamel(d.slice(0, idx).trim()), d.slice(idx + 1).trim()] as [string, string];
    })
    .filter((x): x is [string, string] => x !== null);
}

function valueToJs(raw: string): string {
  const trimmed = raw.trim();
  const pureExpr = trimmed.match(/^\$\{([\s\S]+)\}$/);
  if (pureExpr) return pureExpr[1].trim();
  if (trimmed.includes('${')) return '`' + trimmed + '`';
  return `'${trimmed.replace(/'/g, "\\'")}'`;
}

const STATIC_TOKEN_ROOTS = new Set(['color', 'space', 'radius', 'fontFamily', 'fontWeight', 'controlHeight']);

/**
 * `Feature.css.ts` runs at module scope — it can reference the static token
 * objects (`color.positive.border`, ...) but not a component-local variable
 * or prop (`gap`, `t.pct`), which only exists per-render. A value is "static"
 * only if every identifier it references is either a JS/CSS literal or one of
 * the token roots above.
 */
/** Only identifiers that START a dotted access chain count as "roots" — a negative lookbehind for a preceding `.` excludes property names like `positive`/`border` in `color.positive.border`, which aren't top-level bindings. */
function rootsIn(expr: string): string[] {
  return [...expr.matchAll(/(?<!\.)\b[A-Za-z_$][A-Za-z0-9_$]*/g)].map((m) => m[0]);
}

function isStaticExpr(raw: string): boolean {
  const exprs = [...raw.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1]);
  if (exprs.length === 0) return true;
  return exprs.every((expr) => rootsIn(expr).every((r) => STATIC_TOKEN_ROOTS.has(r) || /^\d+$/.test(r)));
}

function declsToObjectLiteral(decls: Array<[string, string]>, indent: string, usedRoots: Set<string>): { code: string; dynamic: Array<[string, string]> } {
  const staticDecls = decls.filter(([, v]) => isStaticExpr(v));
  const dynamic = decls.filter(([, v]) => !isStaticExpr(v));
  // Track roots from the CSS values' own `${...}` expressions, not by
  // re-scanning the rendered output text — a CSS literal like
  // `'space-between'` contains "space" as its own hyphen-bounded word, which
  // a naive `\bspace\b` re-scan over the finished text would misread as a
  // real reference to the `space` token object.
  for (const [, v] of staticDecls) for (const expr of [...v.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1])) for (const r of rootsIn(expr)) if (STATIC_TOKEN_ROOTS.has(r)) usedRoots.add(r);
  return { code: staticDecls.map(([k, v]) => `${indent}${k}: ${valueToJs(v)},`).join('\n'), dynamic };
}

function getOrCreate(registry: Map<string, ClassEntry>, name: string): ClassEntry {
  let entry = registry.get(name);
  if (!entry) {
    entry = { original: name, camel: kebabToCamel(name), base: [], media: new Map(), pseudo: new Map() };
    registry.set(name, entry);
  }
  return entry;
}

function buildRegistry(css: string): { registry: Map<string, ClassEntry>; descendants: DescendantOverride[]; unsupported: string[] } {
  const registry = new Map<string, ClassEntry>();
  const descendants: DescendantOverride[] = [];
  const unsupported: string[] = [];

  const process = (selector: string, body: string, media?: string) => {
    if (selector.startsWith('@media')) {
      const query = selector.replace(/^@media\s*/, '');
      for (const inner of splitBlocks(body)) process(inner.selector, inner.body, query);
      return;
    }

    const tokens = selector.split(/\s+/).filter(Boolean);

    if (tokens.length === 1) {
      const m = tokens[0].match(/^\.([a-zA-Z0-9_-]+)(.*)$/);
      if (!m) {
        unsupported.push(`${selector} { ${body} }`);
        return;
      }
      const [, className, suffix] = m;
      const entry = getOrCreate(registry, className);
      const decls = parseDecls(body);
      if (suffix && media) {
        unsupported.push(`${selector} (inside @media ${media}) { ${body} }`);
      } else if (suffix) {
        entry.pseudo.set(suffix, [...(entry.pseudo.get(suffix) ?? []), ...decls]);
      } else if (media) {
        entry.media.set(media, [...(entry.media.get(media) ?? []), ...decls]);
      } else {
        entry.base.push(...decls);
      }
      return;
    }

    if (tokens.length === 2 && /^\.[a-zA-Z0-9_-]+$/.test(tokens[0]) && /^\.[a-zA-Z0-9_-]+$/.test(tokens[1]) && !media) {
      const parent = tokens[0].slice(1);
      const child = tokens[1].slice(1);
      getOrCreate(registry, parent);
      getOrCreate(registry, child);
      descendants.push({ parent, child, decls: parseDecls(body) });
      return;
    }

    unsupported.push(`${selector}${media ? ` (inside @media ${media})` : ''} { ${body} }`);
  };

  for (const block of splitBlocks(css)) process(block.selector, block.body);
  return { registry, descendants, unsupported };
}

/** Groups classes sharing a `prefix--suffix` naming pattern into a lookup object, when the bare `prefix` class also exists — the shape the assistant uses for a sentiment/tone switch. */
function findVariantGroups(registry: Map<string, ClassEntry>): VariantGroup[] {
  const byPrefix = new Map<string, Map<string, string>>();
  for (const name of registry.keys()) {
    const m = name.match(/^(.+)--([a-zA-Z0-9_]+)$/);
    if (!m) continue;
    const [, prefix, suffix] = m;
    if (!registry.has(prefix)) continue;
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, new Map());
    byPrefix.get(prefix)!.set(suffix, registry.get(name)!.camel);
  }
  return [...byPrefix.entries()]
    .filter(([, members]) => members.size > 1)
    .map(([prefix, members]) => {
      const camelPrefix = kebabToCamel(prefix);
      return { prefix, camelPrefix, constName: `${camelPrefix}VariantClass`, members };
    });
}

function buildCssFile(registry: Map<string, ClassEntry>, descendants: DescendantOverride[], variantGroups: VariantGroup[], unsupported: string[]): string {
  const usesGlobalStyle = descendants.length > 0;
  const lines: string[] = [];
  const usedRoots = new Set<string>();

  const dynamicNote = (dynamic: Array<[string, string]>, source: string) =>
    dynamic.length ? [`  /* Not statically extractable — references a component-local value, not a token.`, `     Apply these via an inline \`style\` prop at the call site instead:`, ...dynamic.map(([k, v]) => `     ${k}: ${v}`), `     (from ${source}) */`] : [];

  for (const entry of registry.values()) {
    const parts: string[] = [];
    const notes: string[] = [];
    if (entry.base.length) {
      const { code, dynamic } = declsToObjectLiteral(entry.base, '  ', usedRoots);
      if (code) parts.push(code);
      notes.push(...dynamicNote(dynamic, `${entry.original}`));
    }
    if (entry.media.size) {
      const mediaEntries = [...entry.media.entries()].map(([query, decls]) => {
        const { code, dynamic } = declsToObjectLiteral(decls, '      ', usedRoots);
        notes.push(...dynamicNote(dynamic, `${entry.original} @media ${query}`));
        return code ? `    '${query}': {\n${code}\n    },` : null;
      });
      const mediaLines = mediaEntries.filter(Boolean).join('\n');
      if (mediaLines) parts.push(`  '@media': {\n${mediaLines}\n  },`);
    }
    if (entry.pseudo.size) {
      const pseudoEntries = [...entry.pseudo.entries()].map(([suffix, decls]) => {
        const { code, dynamic } = declsToObjectLiteral(decls, '      ', usedRoots);
        notes.push(...dynamicNote(dynamic, `${entry.original}${suffix}`));
        return code ? `    '&${suffix}': {\n${code}\n    },` : null;
      });
      const pseudoLines = pseudoEntries.filter(Boolean).join('\n');
      if (pseudoLines) parts.push(`  selectors: {\n${pseudoLines}\n  },`);
    }
    lines.push(`export const ${entry.camel} = style({`, parts.join('\n'), '});', ...notes, '');
  }

  for (const group of variantGroups) {
    const memberLines = [...group.members.entries()].map(([suffix, camel]) => `  ${suffix}: ${camel},`).join('\n');
    lines.push(`export const ${group.constName} = {\n${memberLines}\n};`, '');
  }

  for (const d of descendants) {
    const parentCamel = registry.get(d.parent)!.camel;
    const childCamel = registry.get(d.child)!.camel;
    const { code, dynamic } = declsToObjectLiteral(d.decls, '  ', usedRoots);
    if (code) lines.push(`globalStyle(\`\${${parentCamel}} \${${childCamel}}\`, {`, code, '});', ...dynamicNote(dynamic, `${d.parent} ${d.child}`), '');
    else if (dynamic.length) lines.push(...dynamicNote(dynamic, `${d.parent} ${d.child}`), '');
  }

  if (unsupported.length) {
    lines.push('/* Not auto-converted — selector shape not recognized by this transform:', ...unsupported.map((u) => ` * ${u}`), ' */', '');
  }

  const body = lines.join('\n').trimEnd() + '\n';
  const importLines = [`import { style${usesGlobalStyle ? ', globalStyle' : ''} } from '@vanilla-extract/css';`, ...(usedRoots.size ? [`import { ${[...usedRoots].sort().join(', ')} } from '@msanagu/pearl';`] : [])];

  return `${importLines.join('\n')}\n\n${body}`;
}

/** Rewrites `className="x"` / `className={\`...\`}` in the component body to reference the generated style consts. */
function rewriteClassNames(body: string, registry: Map<string, ClassEntry>, variantGroups: VariantGroup[]): string {
  const variantByPrefix = new Map(variantGroups.map((g) => [g.prefix, g]));

  let out = body.replace(/className="([a-zA-Z0-9_-]+)"/g, (full, name: string) => {
    const entry = registry.get(name);
    return entry ? `className={${entry.camel}}` : full;
  });

  out = out.replace(/className=\{`([^`]*)`\}/g, (_full, tpl: string) => {
    const segments = tpl.split(/\s+/).filter(Boolean);
    const rewritten = segments.map((seg) => {
      const modMatch = seg.match(/^([a-zA-Z0-9_-]+)--\$\{([^}]+)\}$/);
      if (modMatch) {
        const [, prefix, expr] = modMatch;
        const group = variantByPrefix.get(prefix);
        if (group) return `\${${group.constName}[${expr.trim()}]}`;
      }
      const literal = registry.get(seg);
      if (literal) return `\${${literal.camel}}`;
      return seg;
    });
    if (rewritten.length === 1 && rewritten[0].startsWith('${') && rewritten[0].endsWith('}')) {
      return `className={${rewritten[0].slice(2, -1)}}`;
    }
    return `className={\`${rewritten.join(' ')}\`}`;
  });

  return out;
}

function collectUsedIdentifiers(body: string): { pearl: string[]; icons: string[]; needsReact: boolean } {
  const pearl = PEARL_EXPORTS.filter((name) => new RegExp(`\\b${name}\\b`).test(body));
  // Require PascalCase right after "Pi" (react-icons' own naming convention)
  // so a plain word that happens to start with "Pi" — "Pipeline" used as a
  // string literal, say — doesn't get mistaken for an icon component.
  const iconMatches = body.match(/\bPi[A-Z][A-Za-z0-9]*\b/g) ?? [];
  const icons = [...new Set(iconMatches)].sort();
  const needsReact = /\bReact\./.test(body);
  return { pearl, icons, needsReact };
}

export interface DisplaySnippets {
  /** `null` when the generated code has no `<style>` block to extract. */
  cssFile: string | null;
  componentFile: string;
}

export function toDisplaySnippets(code: string): DisplaySnippets {
  const { css, withoutStyle } = extractStyleBlock(code);

  let componentBody = withoutStyle;
  let cssFile: string | null = null;
  let cssExportNames: string[] = [];

  if (css) {
    const { registry, descendants, unsupported } = buildRegistry(css);
    const variantGroups = findVariantGroups(registry);
    cssFile = buildCssFile(registry, descendants, variantGroups, unsupported);
    componentBody = rewriteClassNames(componentBody, registry, variantGroups);

    const allExports = [...[...registry.values()].map((e) => e.camel), ...variantGroups.map((g) => g.constName)];
    cssExportNames = allExports.filter((name) => new RegExp(`\\b${name}\\b`).test(componentBody));
  }

  const renderMatch = componentBody.match(/render\(<(\w+)\s*\/>\);?\s*$/m);
  if (renderMatch) {
    componentBody = componentBody.slice(0, renderMatch.index).trimEnd() + `\n\nexport default ${renderMatch[1]};\n`;
  }

  const { pearl, icons, needsReact } = collectUsedIdentifiers(componentBody);
  const importLines: string[] = [];
  if (needsReact) importLines.push(`import * as React from 'react';`);
  if (icons.length) importLines.push(`import { ${icons.join(', ')} } from 'react-icons/pi';`);
  if (pearl.length) importLines.push(`import { ${[...pearl].sort().join(', ')} } from '@msanagu/pearl';`);
  if (cssExportNames.length) importLines.push(`import { ${cssExportNames.join(', ')} } from './Feature.css';`);

  const componentFile = [...importLines, '', componentBody.trim(), ''].join('\n');

  return { cssFile, componentFile };
}
