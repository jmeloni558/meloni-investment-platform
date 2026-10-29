import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('only the visible primary section is highlighted, including listings over saved properties',()=>{
  const refresh=read('app-navigation-toolbar.js').match(/  function refresh\(\)\{[^\n]+/)[0];
  const buttons=['appNavNew','appNavExisting','appNavListings','appNavMortgage'].map(id=>({id,active:false,classList:{toggle(_name,on){buttons.find(b=>b.classList===this).active=on;}},setAttribute(){},removeAttribute(){}}));
  let listings=false,section='propertyhub',bpoMode=null;
  const context={ensureToolbar:()=>true,cleanWorkflow(){},retireLegacyNavigation(){},uiShowsSignedOut:()=>false,mortgageMode:false,setMortgageMode(){},activeSection:()=>section,primary:['dashboard'],document:{getElementById:id=>id==='ptBpoWorkspace'&&bpoMode?{dataset:{bpoMode}}:id==='ptListingsPanel'?{classList:{contains:()=>listings}}:null,querySelectorAll:()=>buttons}};
  vm.createContext(context);vm.runInContext(refresh,context);
  const current=()=>buttons.filter(b=>b.active).map(b=>b.id);
  context.refresh();assert.deepEqual(current(),['appNavExisting']);
  listings=true;context.refresh();assert.deepEqual(current(),['appNavListings']);
  context.refresh();assert.deepEqual(current(),['appNavListings']);
  listings=false;context.refresh();assert.deepEqual(current(),['appNavExisting']);
  section='dashboard';context.refresh();assert.deepEqual(current(),['appNavNew']);
  for(const [mode,expected] of [['new','appNavNew'],['saved','appNavExisting'],['library','appNavExisting']]){bpoMode=mode;context.refresh();assert.deepEqual(current(),[expected]);context.refresh();assert.deepEqual(current(),[expected]);}
});
test('standalone signed-in toolbar includes account controls and excludes injected guest Guides',()=>{
  const source=read('pricing-account-toolbar.js');
  assert.match(source,/id="authUser"/);assert.match(source,/id="profileBrandBtn"/);assert.match(source,/id="signOutBtn"/);
  assert.match(source,/setAttribute\('aria-current','page'\)/);
  assert.match(read('compliance-footer.js'),/if\(nav.dataset.accountToolbar\)return/);
});

test('BPO routing refreshes the toolbar after asynchronous workspace changes',()=>{
 const route=read('bpo-workspace.js').match(/function route\(\)\{[^\n]+/)[0];let refreshed=0,replaced='';
 const context={URL,location:{href:'https://propertythesis.com/'},history:{state:{},replaceState(_a,_b,url){replaced=String(url);}},window:{AppNavigationToolbar:{refresh(){refreshed++;}}},dialog:{classList:{contains:()=>false}},record:null,step:3};
 vm.createContext(context);vm.runInContext(route,context);context.route();assert.equal(new URL(replaced).searchParams.get('bpo'),'new');assert.equal(refreshed,1);
 context.record={id:'saved-test'};context.route();assert.equal(new URL(replaced).searchParams.get('bpo'),'saved-test');assert.equal(refreshed,2);
 context.record=null;context.dialog.classList.contains=()=>true;context.route();assert.equal(new URL(replaced).searchParams.get('bpo'),'library');assert.equal(refreshed,3);
 context.dialog=null;context.route();assert.equal(new URL(replaced).searchParams.has('bpo'),false);assert.equal(refreshed,4);
});
