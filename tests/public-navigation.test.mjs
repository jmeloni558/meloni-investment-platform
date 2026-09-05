import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public-navigation.js',import.meta.url),'utf8');
function node(text,href){const classes=new Set(),attrs={};if(href)attrs.href=href;return {textContent:text,classList:{contains:k=>classes.has(k),add:k=>classes.add(k),toggle:(k,on)=>on?classes.add(k):classes.delete(k)},getAttribute:k=>attrs[k]??null,hasAttribute:k=>k in attrs,setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k]};}
test('guest route changes select only the current destination, not the green CTA',()=>{
 const links=[node('Start Free Analysis','index.html?home=1'),node('Search Listings','index.html?listing-search=1'),node('Pricing','pricing.html'),node('Guides','guides.html')];
 const nav={...node(''),dataset:{},querySelectorAll:()=>links};let listings=false,guide=false;
 const context={URL,location:{href:'https://propertythesis.com/pricing.html'},document:{readyState:'complete',documentElement:{},body:{classList:{contains:()=>listings}},querySelector:s=>s==='.guide-shell'?guide:s==='#ptListingsPanel.is-open'?listings:null,querySelectorAll:s=>s==='a,button'?links:[nav]},MutationObserver:class{observe(){}},addEventListener(){},requestAnimationFrame:fn=>fn()};
 const run=()=>vm.runInNewContext(source,context),active=()=>links.filter(n=>n.classList.contains('active')).map(n=>n.textContent);
 run();assert.deepEqual(active(),['Pricing']);assert.equal(links[0].classList.contains('pt-free-analysis-cta'),true);
 context.location.href='https://propertythesis.com/index.html';listings=true;run();assert.deepEqual(active(),['Search Listings']);
 listings=false;guide=true;context.location.href='https://propertythesis.com/cap-rate-guide.html';run();assert.deepEqual(active(),['Guides']);
 guide=false;context.location.href='https://propertythesis.com/';run();assert.deepEqual(active(),[]);
});
