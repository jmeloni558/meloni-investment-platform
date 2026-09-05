import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../header-account-panel.css',import.meta.url),'utf8');
test('account styling is loaded and confined to the signed-in header',()=>{
  assert.match(readFileSync(new URL('../app-core.html',import.meta.url),'utf8'),/header-account-panel\.css\?v=1/);
  for(const rule of css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{/g))assert.ok(rule[1].trim().startsWith('@media')||rule[1].trim().startsWith('body.pt-user-signed-in .top.pt-site-header'));
});
test('account identity wraps and controls remain keyboard accessible on small screens',()=>{
  assert.match(css,/overflow-wrap: anywhere/);assert.match(css,/:focus-visible/);assert.match(css,/min-height: 44px/);assert.match(css,/@media \(max-width: 360px\)/);
  assert.doesNotMatch(css,/\.hidden\s*\{/);
});
