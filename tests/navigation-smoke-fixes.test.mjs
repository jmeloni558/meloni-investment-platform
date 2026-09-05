import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('mortgage login uses dedicated sign-in with original return route',async()=>{
 let target;
 const ctx={URLSearchParams,encodeURIComponent,location:{pathname:'/mortgage-tools.html',search:'',hash:'#compare',replace:v=>target=v},document:{documentElement:{classList:{remove(){}}}},window:{}};
 vm.runInNewContext(read('mortgage-tools-page-auth.js'),ctx);
 assert.equal(target,'login.html?return=%2Fmortgage-tools.html%23compare');
});
test('LOI observer waits for a body and tolerates missing DOM',()=>{
 let ready,observed=0;
 const document={body:null,readyState:'loading',addEventListener:(name,fn)=>{if(name==='DOMContentLoaded')ready=fn;}};
 const ctx={document,window:{},addEventListener(){},setTimeout(){},MutationObserver:class{observe(node){assert.ok(node);observed++;}}};
 vm.runInNewContext(read('letter-of-intent-launcher.js'),ctx);
 assert.equal(observed,0);ready();assert.equal(observed,0);
 document.body={};ready();assert.equal(observed,1);
});
test('account-aware pages reserve toolbar space before first paint',()=>{
 for(const file of ['glossary.html','pricing.html','sample-property-card.html','letter-of-intent.html']){
  const html=read(file);assert.ok(html.indexOf('account-nav-pending.js')<html.indexOf('</head>'));assert.match(html,/pricing-account-toolbar.js\?v=8/);
 }
 assert.match(read('pricing-account-toolbar.js'),/reveal\(\);return/);
 assert.match(read('account-nav-pending.js'),/5000/);
 assert.match(read('index.html'),/if\(leftPage\|\|location.href!==entryUrl\)return/);
});
