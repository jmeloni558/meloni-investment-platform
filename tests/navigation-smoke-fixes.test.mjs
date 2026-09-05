import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('legacy login URLs forward to popup and reject external return targets',()=>{
 for(const [query,expected] of [['?return=%2Fmortgage-tools.html','index.html?signin=1&return=%2Fmortgage-tools.html'],['?return=https%3A%2F%2Fevil.example','index.html?signin=1'],['?return=%2Flogin.html','index.html?signin=1']]){
  let target;vm.runInNewContext(read('login-popup-redirect.js'),{URL,URLSearchParams,location:{search:query,origin:'https://propertythesis.com',replace:v=>target=v}});assert.equal(target,expected);
 }
 assert.doesNotMatch(read('login.html'),/<form|type="password"/);
 assert.doesNotMatch(read('dedicated-login-router.js'),/login\.html/);
});
test('popup requests wait for shared auth UI and retain initial return route',()=>{
 const source=read('guest-homepage-v2.js');
 assert.match(source,/const params=entryParams,raw=params.get\('return'\)/);
 assert.match(source,/entryParams.get\('signin'\)==='1'&&window.PropertyThesisAuth\?\.open&&document.getElementById\('ptAuthModes'\)/);
 assert.match(source,/window.PropertyThesisAuth.open\('signin'/);
});
test('mortgage login uses shared popup with original return route',async()=>{
 let target;
 const ctx={URLSearchParams,encodeURIComponent,location:{pathname:'/mortgage-tools.html',search:'',hash:'#compare',replace:v=>target=v},document:{documentElement:{classList:{remove(){}}}},window:{}};
 vm.runInNewContext(read('mortgage-tools-page-auth.js'),ctx);
 assert.equal(target,'index.html?signin=1&return=%2Fmortgage-tools.html%23compare');
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
