import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../sample-report.html',import.meta.url),'utf8');
test('sample uses the actual report section sequence and neutral branding',()=>{
 const sections=['Property Thesis','Key Investment Findings','Investment Analysis Summary','Investment Snapshot','Acquisition &amp; Operating Assumptions','Income-Based Valuation','Financing Summary','Projected Operating Performance','Disposition &amp; Tax Summary','Investment Return Analysis','Investment Recommendation / Offer Analysis','Investment Conclusion'];
 let previous=-1;for(const section of sections){const i=html.indexOf(section);assert.ok(i>previous,section);previous=i;}
 assert.equal((html.match(/<section class="page/g)||[]).length,9);
 for(let i=1;i<=9;i++)assert.ok(html.includes(`Page ${i} of 9`));
 assert.doesNotMatch(html,/Meloni Realty|Cayuga|jrmeloni|jamiemeloni|BK3167461|813-760|Pre-Tax Cash Flow|Sample Market Evidence/);
 assert.match(html,/Your Company/);assert.match(html,/Demonstration only/);
});
test('sample has every annual after-tax row, PDF link and stable print geometry',()=>{
 for(let i=0;i<=7;i++)assert.ok(html.includes('Year '+i));
 assert.match(html,/After-Tax Operating Cash Flow/);assert.match(html,/Taxes From Operations/);
 assert.match(html,/propertythesis-sample-report.pdf/);
 const css=readFileSync(new URL('../sample-report-layout.css',import.meta.url),'utf8');
 assert.match(css,/@page\{size:letter;margin:0\}/);assert.match(css,/print-color-adjust:exact/);
 assert.match(css,/@media screen and/); // Screen breakpoints must not collapse print grids.
});
