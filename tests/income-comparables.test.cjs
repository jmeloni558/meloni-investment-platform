const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../income-comparables-model.js');
const make=(overrides={})=>M.snapshot({subjectId:'subject',analysis:{id:'a1',property_id:'comp',revision:4,name:'Income analysis',updated_at:'2026-10-19',assumptions:{price:600000,units:4,rent:1500,vacancy:.05,opEx:.3}},property:{id:'comp',address:'100 Example Street'},evidence:{salePrice:600000,saleDate:'2026-09-01',incomeBasis:'actual',period:'T12 September 2026',source:'Seller operating statement'},result:{engineVersion:4,years:[{pgi:72000,vac:3600,egi:68400,opex:20520,noi:47880}]},now:'2026-10-19T12:00:00Z',...overrides});
test('cap rate uses annual NOI and closed sale price, not cash flow or asking price',()=>{const c=make();assert.equal(c.capRate,.0798);assert.equal(c.operating.noi,47880);});
test('evidence snapshot is independent of later source mutations',()=>{const a={id:'a1',property_id:'comp',assumptions:{price:600000}};const c=make({analysis:a});a.assumptions.price=1;assert.equal(c.assumptions.price,600000);});
test('self-comparisons and incomplete protected results are rejected',()=>{assert.throws(()=>make({subjectId:'comp'}),/different/);assert.throws(()=>make({result:{years:[{noi:47880}]}}),/complete/);});
test('impossible/future sale dates and missing evidence are rejected',()=>{for(const date of ['2026-02-30','2027-01-01',''])assert.throws(()=>make({evidence:{saleDate:date,salePrice:600000}}),/date/);assert.throws(()=>make({evidence:{saleDate:'2026-09-01',salePrice:600000,incomeBasis:'actual',source:'',period:''}}),/source/);});
test('nonpositive NOI excluded from summary but retained in report',()=>{const c=make(),bad={...c,id:'bad',operating:{...c.operating,noi:-1000}};assert.equal(M.summarize([c,bad]).count,1);assert.match(M.reportHtml({items:[c,bad]},100000,.08),/-\$1,000/);});
test('equal-weight median and mean do not double weight large sales',()=>{const a=make(),b={...make(),id:'b',salePrice:1200000};const s=M.summarize([a,b]);assert.equal(s.mean,.05985);assert.equal(s.median,.05985);assert.equal(M.summarize([{...a,included:false},b]).count,1);});
test('adoption requires positive rate, included evidence and rationale',()=>{assert.throws(()=>M.reconciliation(.08,'', [make()]),/Explain/);assert.throws(()=>M.reconciliation(0,'reason',[make()]),/greater/);assert.throws(()=>M.reconciliation(.08,'reason',[]),/Include/);});
test('report shows value at selected rate, mismatch and escaped evidence',()=>{const c=make();c.source='<img src=x onerror=alert(1)>';const html=M.reportHtml({items:[c],reconciliation:{rate:.08,notes:'Close substitutes'}},80000,.07);assert.match(html,/\$1,000,000/);assert.match(html,/different cap rate/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img/);assert.match(html,/Actual operating data/);});
test('missing NOI does not render a zero valuation',()=>{const html=M.reportHtml({items:[make()],reconciliation:{rate:.08,notes:'reason'}},null,.08);assert.match(html,/Not indicated/);});
test('source freshness distinguishes an older tab cache from a newer source edit',()=>{
 const c=make();
 assert.equal(M.sourceIsStale(c,{revision:3,updated_at:'2026-10-18'}),false);
 assert.equal(M.sourceIsStale(c,{revision:4,updated_at:'2026-10-19'}),false);
 assert.equal(M.sourceIsStale(c,{revision:5,updated_at:'2026-10-20'}),true);
 assert.equal(M.sourceIsStale(c,{revision:4,updated_at:'2026-10-19T00:01:00Z'}),true);
 assert.equal(M.sourceIsStale(c,null),true);
});
test('report source-note separators preserve punctuation and escape text',()=>{
 const c=make(); c.source='Synthetic transaction.'; c.notes='Already punctuated!';
 let html=M.reportHtml({items:[c]},47880,.08);
 assert.match(html,/Source: Synthetic transaction\. Already punctuated! Snapshot:/);
 c.source='Synthetic transaction'; c.notes='<b>Untrusted note</b>';
 html=M.reportHtml({items:[c]},47880,.08);
 assert.match(html,/Source: Synthetic transaction\. &lt;b&gt;Untrusted note&lt;\/b&gt;\. Snapshot:/);
});
