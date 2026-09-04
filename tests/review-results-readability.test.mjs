import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../review-results-readability.css', import.meta.url), 'utf8');
const core = readFileSync(new URL('../app-core.html', import.meta.url), 'utf8');
const luminance = hex => {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(x => parseInt(x, 16) / 255)
    .map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
test('review stylesheet is loaded by the application', () => {
  assert.match(core, /href="review-results-readability\.css\?v=1"/);
});
test('highlighted metrics override the global primary button background, without targeting buttons', () => {
  assert.match(css, /#dashboard #ptDecisionCenter \.ptdc-metric\.primary,\s*#dashboard #investmentOfferAnalysis \.ioa-box\.primary\s*\{\s*background: #edf7f2 !important;/);
});
test('review text palette has at least 7:1 contrast on all review surfaces', () => {
  const inks = [...css.matchAll(/--review-(?:ink|copy|muted): (#[a-f\d]{6})/g)].map(x => x[1]);
  const surfaces = [...css.matchAll(/background: (#[a-f\d]{6})/g)].map(x => x[1]);
  assert.equal(inks.length, 3);
  assert.ok(surfaces.length >= 4);
  for (const ink of inks) for (const surface of [...surfaces, '#ffffff', '#fffaf3']) {
    const levels = [luminance(ink), luminance(surface)].sort((a, b) => b - a);
    const contrast = (levels[0] + 0.05) / (levels[1] + 0.05);
    assert.ok(contrast >= 7, `${ink} on ${surface}: ${contrast.toFixed(2)}:1`);
  }
});
test('readability styles stay screen-only and scoped to Review Results', () => {
  assert.match(css, /@media screen\s*\{/);
  assert.doesNotMatch(css, /#report|\.rb-|#clientReport|@media print/);
  for (const rule of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)) {
    const selector = rule[1].trim();
    assert.ok(selector.startsWith('#dashboard') || selector.startsWith('@media'), selector);
  }
});
test('small screens stack the expanded cards and keep tables independently scrollable', () => {
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /#dashboard \.tablewrap \{[^}]*overflow-x: auto/);
});
