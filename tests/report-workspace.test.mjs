import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('report checklist positions offer analysis between investment cash flow and sensitivity',()=>{
  const source=read('report-detail-order.js');
  const order=source.match(/const ORDER=\[([\s\S]*?)\];/)[1];
  assert.ok(order.indexOf('includeInvestmentCashflow')<order.indexOf('offerAnalysis'));
  assert.ok(order.indexOf('offerAnalysis')<order.indexOf('includeSensitivity'));
  assert.match(source,/byKey.offerAnalysis=grid.querySelector/);
  assert.match(source,/data-pt-offer-report/);
});
test('report workspace appearance stays screen-only and limits blue export styling to active or busy actions',()=>{
  const css=read('report-builder-workspace.css');
  assert.match(css,/@media screen/);
  assert.match(css,/button:active/);assert.match(css,/button\[aria-busy=true\]/);
  assert.doesNotMatch(css,/#rbDownloadPdf/);
  assert.match(read('app-core.html'),/report-builder-workspace.css\?v=1/);
});
