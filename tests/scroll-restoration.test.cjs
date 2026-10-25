const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../page-refresh-top.js'),'utf8');
function fixture({type='navigate',search='',saved=null}={}){
 const listeners={},timers=[],scrolls=[],writes=[],store={};
 const add=(name,fn)=>(listeners[name]??=[]).push(fn);
 const ctx={URL,URLSearchParams,Date,performance:{getEntriesByType:()=>[{type}]},history:{state:{keep:'yes',ptScrollY:600},scrollRestoration:'auto',replaceState:s=>writes.push(s)},location:{search,pathname:'/',origin:'https://propertythesis.com',href:'https://propertythesis.com/'+search},sessionStorage:{getItem:()=>saved,removeItem(){},setItem:(k,v)=>store[k]=v},document:{documentElement:{style:{}},addEventListener:add},addEventListener:add,setTimeout:fn=>timers.push(fn),requestAnimationFrame:fn=>timers.push(fn),scrollY:400,window:{scrollTo:o=>scrolls.push(o)}};
 vm.runInNewContext(source,ctx);
 return {ctx,scrolls,writes,listeners,emit:n=>(listeners[n]||[]).forEach(fn=>fn({})),flush:()=>{while(timers.length)timers.shift()();}};
}
test('wheel/key scrolling does not write history; leaving saves position and other state',()=>{
 const f=fixture();for(let i=0;i<120;i++){f.emit('scroll');f.flush();}
 assert.equal(f.writes.length,0);f.emit('pagehide');assert.equal(f.writes[0].ptScrollY,400);assert.equal(f.writes[0].keep,'yes');
});
for(const type of ['wheel','keydown','touchstart','pointerdown'])for(const search of ['', '?home=1'])test(`${type} cancels delayed top resets on ${search||'reload'}`,()=>{
 const f=fixture({type:'reload',search});assert.equal(f.scrolls.length,1);
 f.emit(type);f.emit('DOMContentLoaded');f.emit('load');f.flush();assert.equal(f.scrolls.length,1);
});
test('back restoration yields to input before scheduled restore',()=>{
 const f=fixture({type:'back_forward'});f.emit('DOMContentLoaded');f.emit('wheel');f.flush();assert.equal(f.scrolls.length,0);
});
test('back restoration still restores position without user input',()=>{
 const f=fixture({type:'back_forward'});f.emit('DOMContentLoaded');f.flush();assert.equal(f.scrolls.at(-1).top,600);
});
