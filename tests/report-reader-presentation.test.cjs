const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const M=require('../income-comparables-model.js');
const comp=(noi=24624,included=true)=>({address:'Synthetic sale',salePrice:440000,included,operating:{noi},source:'Test'});
test('income narrative compares actual subject yield, current target, and limited evidence',()=>{
 const text=M.comparisonSummary([comp()],30780,.065,599000);
 for(const expected of ['5.60%','5.14%','0.46 percentage points below','6.50%','$473,538','One sale is limited evidence'])assert(text.includes(expected),expected);
 assert(!text.includes('guarantee'));
});
test('excluded, zero, and missing evidence cannot imply a supported market value',()=>{
 assert.match(M.comparisonSummary([comp(10000,false),comp(0)],30780,.065,599000),/No included/);
 const missing=M.comparisonSummary([comp()],null,.065,599000);assert.match(missing,/Not indicated/);assert(!missing.includes('$0'));
 const two=M.comparisonSummary([comp(),{...comp(30000),salePrice:500000}],30780,.058,599000);assert.match(two,/2 included/);assert.match(two,/falls within/);
});
const stat=(label,value,note='')=>`<div class="rb-stat"><span>${label}</span><b>${value}</b><small>${note}</small></div>`;
function fixture(){const d=new JSDOM(`<div id="clientReport"><div class="rb-report"><header class="rb-cover"><p class="address">Synthetic subject</p></header><div class="rb-conclusion"><p>Earlier summary</p></div><section class="rb-section" data-rb-section="snapshot">${stat('Acquisition Price','$599,000')}${stat('Year 1 NOI','$30,780')}${stat('Capitalization Rate','5.14%','Target 6.50%')}</section><section class="rb-section" data-rb-section="financing"><div class="rb-section-head"><h2>Financing</h2></div>${stat('Loan Amount','$479,200')}${stat('Year 1 Debt Service','$36,346')}</section><section class="rb-section" data-rb-section="returns"><div class="rb-section-head"><h2>Returns</h2></div>${stat('Calculated IRR','9.74%')}${stat('Required Rate of Return','10.00%')}${stat('NPV','($2,716)')}</section></div></div>`,{runScripts:'outside-only'});d.window.eval(fs.readFileSync(path.join(__dirname,'../report-reader-presentation.js'),'utf8'));return d;}
test('reader summary uses rendered values; no-comp fallback, cash case, repeated render and missing values',async()=>{
 const d=fixture(),w=d.window;try{
 Object.defineProperty(w,'state',{get(){throw Error('Must not read mutable calculator state');}});
 w.PropertyThesisReportReader.apply();let summary=w.document.querySelector('[data-rb-section="readerSummary"]');assert.match(summary.textContent,/No comparable evidence/);assert.match(w.document.querySelector('[data-reader-copy="financing"]').textContent,/\$5,566/);assert.match(w.document.querySelector('[data-reader-copy="returns"]').textContent,/fall short/);
 const report=w.document.querySelector('.rb-report');report.insertAdjacentHTML('beforeend',M.reportHtml({items:[comp()]},30780,.065,599000));w.PropertyThesisReportReader.apply();assert.match(summary.textContent,/5.60%/);assert(!summary.textContent.includes('No comparable'));
 w.document.querySelector('[data-rb-section="incomeComparables"]').remove();w.PropertyThesisReportReader.apply();assert.match(summary.textContent,/No comparable/);
 const finance=w.document.querySelector('[data-rb-section="financing"]');finance.querySelector('b').textContent='$0';w.PropertyThesisReportReader.apply();assert.match(finance.textContent,/all-cash/);
 for(let i=0;i<5;i++)w.PropertyThesisReportReader.apply();assert.equal(w.document.querySelectorAll('[data-rb-section="readerSummary"]').length,1);
 assert.equal(w.PropertyThesisReportReader.number('N/A'),null);assert.equal(w.PropertyThesisReportReader.number('($2,716)'),-2716);
 await new Promise(r=>setTimeout(r,120));assert.equal(w.document.querySelectorAll('[data-rb-section="readerSummary"]').length,1);
 }finally{w.close();}
});
test('profile header puts product first, escapes profile, and preserves recipient without repeated contact',()=>{
 const d=new JSDOM('<div id="clientReport"><div class="rb-report"><header class="rb-cover"><p class="address">Synthetic subject</p><div class="rb-meta">Prepared for: Client Name</div></header></div></div>',{runScripts:'outside-only'});const w=d.window;
 try{w.state={price:500000,hold:10};w.UserBranding={getProfile:()=>({company_name:'<script>bad</script>',full_name:'A long professional name',email:'test@example.invalid'})};w.eval(fs.readFileSync(path.join(__dirname,'../report-branding-reader.js'),'utf8'));w.PropertyThesisReportBranding.apply();const h=w.document.querySelector('.pt-split-head');assert(h.firstElementChild.classList.contains('pt-product-side'));assert(h.lastElementChild.classList.contains('pt-user-side'));assert(!h.querySelector('script'));assert(!h.querySelector('.pt-product-mark'));assert.match(w.document.querySelector('.pt-header-meta').textContent,/Client Name/);assert(!w.document.querySelector('.pt-header-meta').textContent.includes('test@example'));
 }finally{w.close();}
});
