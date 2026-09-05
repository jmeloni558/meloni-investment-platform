import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('both public listing routes are recognized for guests',()=>{
 const fn=read('rentcast-listing-search.js').match(/  function dedicatedGuestRoute\(\)\{[^\n]+/)[0];
 for(const search of ['?listing-search=1','?app-action=search-listings']){
  const ctx={URLSearchParams,location:{search},signedIn:()=>false};vm.createContext(ctx);vm.runInContext(fn,ctx);assert.equal(ctx.dedicatedGuestRoute(),true);
 }
 assert.match(read('guest-homepage-v2.js'),/params.get\('listing-search'\)==='1'\|\|params.get\('app-action'\)==='search-listings'/);
});
test('explicit listing destinations skip homepage scroll restoration',()=>{
 for(const search of ['?listing-search=1','?app-action=search-listings']){
  const scrolls=[],ctx={URLSearchParams,performance:{getEntriesByType:()=>[{type:'navigate'}]},history:{scrollRestoration:'auto'},location:{search},window:{scrollTo:o=>scrolls.push(o)},sessionStorage:{removeItem(){},getItem(){throw Error('must not restore previous homepage scroll');}}};
  vm.runInNewContext(read('page-refresh-top.js'),ctx);assert.equal(ctx.history.scrollRestoration,'manual');assert.equal(scrolls.length,1);assert.equal(scrolls[0].top,0);
 }
});
test('public page links use the dedicated listing route',()=>{
 for(const f of ['sample-report-viewer.html','sample-property-card.html','pricing.html','guides.html']){
  assert.match(read(f),/href="index.html\?listing-search=1"/);
  assert.doesNotMatch(read(f),/href="index.html\?app-action=search-listings"/);
 }
});
