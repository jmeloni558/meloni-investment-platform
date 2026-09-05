import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../site-analytics.js',import.meta.url),'utf8');
function setup(options={}){
  const store=new Map([['ptAnalyticsConsentV1',options.consent??'denied'],['ptAnalyticsExcludeV1',options.exclude?'1':'0']]);
  const handlers={},nodes=[],cookies=[];
  const node=()=>({addEventListener(){},appendChild(n){nodes.push(n)},setAttribute(){},classList:{contains(){return false}}});
  const body=node(),head=node();
  const document={body,head,readyState:'complete',referrer:'https://facebook.com/path?private=secret',title:'Private Property Address',createElement:node,getElementById(){return null},querySelector(s){return s==='.pt-footer-legal'?body:null},addEventListener(k,fn){handlers[k]=fn}};
  Object.defineProperty(document,'cookie',{set(v){cookies.push(v)}});
  const window={addEventListener(k,fn){handlers[k]=fn}};window.top=window;window.self=window;
  if(options.iframe)window.top={};
  const context={window,document,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},location:{hostname:options.host??'propertythesis.com',pathname:'/index.html',search:'?address=private&email=secret%40example.com&utm_source=tiktok&utm_medium=organic_social&utm_campaign=launch'},navigator:{globalPrivacyControl:!!options.gpc},URL,URLSearchParams,Date,Set,MutationObserver:class{observe(){}},setTimeout,clearTimeout};
  vm.runInNewContext(source,context);
  const change=(key,value)=>{store.set(key,value);handlers.storage({key})};
  const commands=()=>Array.from(window.dataLayer||[],x=>Array.from(x));
  return {window,nodes,cookies,change,commands,context};
}
test('no Google tag or data queue before permission',()=>{const s=setup();assert.equal(s.nodes.some(n=>n.id==='ptGoogleAnalyticsTag'),false);assert.equal(s.commands().length,0)});
test('consent loads once and sanitizes URLs, titles and attribution',()=>{const s=setup({consent:'granted'});assert.equal(s.nodes.filter(n=>n.id==='ptGoogleAnalyticsTag').length,1);const c=s.commands().find(x=>x[0]==='config')[2];assert.equal(c.send_page_view,false);assert.equal(c.page_location,'https://propertythesis.com/');assert.equal(c.page_referrer,'https://facebook.com/');assert.equal(c.campaign_source,'tiktok');assert.equal(c.allow_google_signals,false);assert.doesNotMatch(JSON.stringify(s.commands()),/secret|private|Private Property/);assert.equal(s.commands().filter(x=>x[0]==='event'&&x[1]==='page_view').length,1)});
test('exclusion, GPC, localhost and iframes do not load Google',()=>{for(const opts of [{exclude:true},{gpc:true},{host:'localhost'},{iframe:true}]){const s=setup({consent:'granted',...opts});assert.equal(s.nodes.some(n=>n.id==='ptGoogleAnalyticsTag'),false)}});
test('withdrawal and renewed consent work across tabs without duplicate loader',()=>{const s=setup({consent:'granted'});s.change('ptAnalyticsConsentV1','denied');assert.equal(s.window['ga-disable-G-3Y51BMR6FC'],true);assert.ok(s.cookies.length>=2);s.change('ptAnalyticsConsentV1','granted');assert.equal(s.window['ga-disable-G-3Y51BMR6FC'],false);assert.ok(s.commands().some(x=>x[0]==='consent'&&x[2].analytics_storage==='granted'));assert.equal(s.nodes.filter(n=>n.id==='ptGoogleAnalyticsTag').length,1)});
test('module double inclusion is harmless',()=>{const s=setup({consent:'granted'});vm.runInNewContext(source,s.context);assert.equal(s.nodes.filter(n=>n.id==='ptGoogleAnalyticsTag').length,1)});
