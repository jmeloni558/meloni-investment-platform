import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('only the visible primary section is highlighted, including listings over saved properties',()=>{
  const refresh=read('app-navigation-toolbar.js').match(/  function refresh\(\)\{[^\n]+/)[0];
  const buttons=['appNavNew','appNavExisting','appNavListings','appNavMortgage'].map(id=>({id,active:false,classList:{toggle(_name,on){buttons.find(b=>b.classList===this).active=on;}},setAttribute(){},removeAttribute(){}}));
  let listings=false,section='propertyhub';
  const context={ensureToolbar:()=>true,cleanWorkflow(){},retireLegacyNavigation(){},uiShowsSignedOut:()=>false,mortgageMode:false,setMortgageMode(){},activeSection:()=>section,primary:['dashboard'],document:{getElementById:id=>id==='ptListingsPanel'?{classList:{contains:()=>listings}}:null,querySelectorAll:()=>buttons}};
  vm.createContext(context);vm.runInContext(refresh,context);
  const current=()=>buttons.filter(b=>b.active).map(b=>b.id);
  context.refresh();assert.deepEqual(current(),['appNavExisting']);
  listings=true;context.refresh();assert.deepEqual(current(),['appNavListings']);
  context.refresh();assert.deepEqual(current(),['appNavListings']);
  listings=false;context.refresh();assert.deepEqual(current(),['appNavExisting']);
  section='dashboard';context.refresh();assert.deepEqual(current(),['appNavNew']);
});
test('standalone signed-in toolbar includes account controls and excludes injected guest Guides',()=>{
  const source=read('pricing-account-toolbar.js');
  assert.match(source,/id="authUser"/);assert.match(source,/id="profileBrandBtn"/);assert.match(source,/id="signOutBtn"/);
  assert.match(source,/setAttribute\('aria-current','page'\)/);
  assert.match(read('compliance-footer.js'),/if\(nav.dataset.accountToolbar\)return/);
});
