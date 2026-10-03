const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../profile-system.js'),'utf8');
function harness(result){
 const calls={writes:0,out:0,cleared:0,prompt:0}, elements=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',remove(){calls.closed=true;}});return elements.get(id);};
 const context={console,window:{},document:{readyState:'loading',addEventListener(){},getElementById:el,querySelector(){return null;}},setTimeout(){},
  showAuth(){calls.prompt++;},authMsg(m){calls.message=m;},async setCloudUser(u){assert.equal(u,null);calls.cleared++;},
  cloudClient:{auth:{async getSession(){return {data:{session:{user:{id:'fixture'}}}};},async getUser(){if(result instanceof Error)throw result;return result;},async signOut(o){assert.equal(o.scope,'local');calls.out++;}},
   from(){calls.writes++;return {upsert(){return {select(){return {async single(){return {data:{user_id:'fixture'}};}};}};}};}}
 };
 vm.runInNewContext(source,context);return {calls,el,save:()=>context.window.ProfileSystem.save()};
}
test('deleted user is signed out and prompted before any profile write',async()=>{
 const h=harness({error:{code:'user_not_found',status:403}});await h.save();
 assert.equal(h.calls.writes,0);assert.equal(h.calls.out,1);assert.equal(h.calls.cleared,1);assert.equal(h.calls.prompt,1);assert.match(h.calls.message,/sign in again/);
});
test('network errors preserve session and block the write with retry guidance',async()=>{
 for(const result of [new Error('offline'),{error:{status:503}}]){const h=harness(result);await h.save();assert.equal(h.calls.writes,0);assert.equal(h.calls.out,0);assert.equal(h.calls.prompt,0);assert.match(h.el('psStatus').textContent,/connection/);}
});
test('valid verified account can save',async()=>{const h=harness({data:{user:{id:'fixture'}}});await h.save();assert.equal(h.calls.writes,1);assert.equal(h.calls.out,0);assert.equal(h.el('psStatus').textContent,'Profile saved.');});
test('account switching during verification cannot save the old profile',async()=>{const h=harness({data:{user:{id:'other'}}});await h.save();assert.equal(h.calls.writes,0);assert.equal(h.calls.out,0);assert.match(h.el('psStatus').textContent,/account changed/);});
