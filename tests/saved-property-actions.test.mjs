import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../saved-property-actions.css', import.meta.url), 'utf8');
const core = readFileSync(new URL('../app-core.html', import.meta.url), 'utf8');

test('saved-property styles are loaded, screen-only, and scoped to card actions', () => {
  assert.match(core, /href="saved-property-actions\.css\?v=1"/);
  for (const rule of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)) {
    assert.ok(rule[1].trim() === '@media screen' || rule[1].trim().startsWith('#propertyhub.section .hub-card .hub-actions .btn'));
  }
});

test('legacy button classes share a fill, with accessible focus and disabled states', () => {
  assert.match(css, /\.btn\s*\{\s*background: #fff !important/);
  assert.match(css, /:focus-visible\s*\{\s*outline: 3px solid/);
  assert.match(css, /:disabled\s*\{[\s\S]*?cursor: not-allowed/);
  assert.match(css, /\[data-hub-delete\]\s*\{\s*color: #a12622/);
  assert.doesNotMatch(css, /\.primary|\.secondary|\.ghost/);
});
