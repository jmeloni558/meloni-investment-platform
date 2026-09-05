import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../workflow-navigation-emphasis.css', import.meta.url), 'utf8');
const core = readFileSync(new URL('../app-core.html', import.meta.url), 'utf8');
test('workflow emphasis is loaded and scoped to the existing navigation', () => {
  assert.match(core, /href="workflow-navigation-emphasis\.css\?v=1"/);
  assert.match(css, /@media screen/);
  for (const rule of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)) {
    const selector = rule[1].trim();
    assert.ok(selector.startsWith('#stage8Workflow.s8-wrap') || selector.startsWith('@media'), selector);
  }
});
test('current step has a text badge and keyboard users have a visible focus outline', () => {
  assert.match(css, /content: 'CURRENT STEP'/);
  assert.match(css, /:focus-visible\s*\{\s*outline: 3px solid #123b56 !important/);
  assert.match(css, /padding: 38px 14px 18px !important/);
});
test('navigation remains responsive and does not introduce sticky scrolling', () => {
  assert.match(css, /@media \(max-width: 850px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /position:\s*(?:fixed|sticky)|scroll-behavior/);
});
