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
 const report=w.document.querySelector('.rb-report');report.insertAdjacentHTML('beforeend',M.reportHtml({items:[comp()]},30780,.065,599000));w.PropertyThesisReportReader.apply();assert.match(w.document.querySelector('[data-rb-section="readerConclusion"]').textContent,/5.6%/);assert(!summary.textContent.includes('No comparable'));assert.match(summary.textContent,/idea being tested/);assert(!summary.textContent.includes('not supported'));assert.match(w.document.querySelector('[data-rb-section="readerConclusion"]').textContent,/not supported/);
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

 test('standalone thesis explains goals without inventing comps; conclusion tests pricing and return goals',()=>{
 const d=fixture(),w=d.window;try{
 const snap=w.document.querySelector('[data-rb-section="snapshot"]');snap.insertAdjacentHTML('beforeend',stat('Gross Rent Multiplier','10.51x','Target 8.35x'));
 w.PropertyThesisReportReader.apply();const opening=w.document.querySelector('[data-rb-section="readerSummary"]'),ending=w.document.querySelector('[data-rb-section="readerConclusion"]');
 for(const word of ['6.5%','10%','8.35','before expenses','not promised','standalone property analysis'])assert(opening.textContent.includes(word),word);
 assert(!/challenge|partly support|falls short|5.60%/.test(opening.textContent));
 assert.match(ending.textContent,/10.51 times annual gross rent, above the 8.35x target/);
 assert.match(ending.textContent,/rather than independent market confirmation/);
 assert.equal(w.document.querySelectorAll('[data-rb-section="incomeComparables"],[data-rb-section="salesComparables"]').length,0);
 snap.querySelectorAll('b')[2].textContent='7.00%';w.PropertyThesisReportReader.apply();assert.match(ending.textContent,/partly support/);
 snap.querySelectorAll('b')[3].textContent='8.00x';w.document.querySelector('[data-rb-section="returns"] b').textContent='12.00%';w.document.querySelectorAll('[data-rb-section="financing"] b')[1].textContent='$20,000';w.PropertyThesisReportReader.apply();assert.match(ending.textContent,/modeled results support/);
 assert.equal(w.document.querySelector('.rb-report').lastElementChild,ending);
 }finally{w.close();}
 });
test('whole report strips only trailing decimal zeros and preserves profile details',()=>{const d=fixture(),w=d.window;try{const report=w.document.querySelector('.rb-report');report.insertAdjacentHTML('beforeend','<section class="rb-section"><p>Target 10.00%, rate 6.50%, yield 5.14%, multiple 1.20x.</p><table><tr><td>6.50%</td><td>0.00%</td><td>Address 1.00 Street</td></tr></table></section>');w.PropertyThesisReportReader.apply();assert.match(report.textContent,/Target 10%, rate 6.5%, yield 5.14%, multiple 1.2x/);assert.equal(report.querySelector('td').textContent,'6.5%');assert.equal(report.querySelectorAll('td')[1].textContent,'0%');assert.equal(report.querySelectorAll('td')[2].textContent,'Address 1.00 Street');}finally{w.close();}});
test('mortgage assumptions use saved inputs and disappear for cash',()=>{const d=new JSDOM('<div id="clientReport"></div>',{url:'https://fixture.invalid',runScripts:'outside-only'}),w=d.window;try{w.state={price:500000,land:100000,mortgage:400000,mortRate:.065,loanYears:30,interestOnly:false,hold:10,units:2,rent:1500};w.result={years:[{year:1,noi:25000,atcf:1000}],cfs:[-100000,110000],initial:-100000};w.eval(fs.readFileSync(path.join(__dirname,'../report-builder-v1.js'),'utf8'));w.ReportBuilderV1.render();let area=w.document.querySelector('[data-rb-section="assumptions"]');assert.match(area.textContent,/Mortgage Assumptions/);assert.match(area.textContent,/Down Payment\$100,000/);assert.match(area.textContent,/Mortgage Rate6.50%/);assert.match(area.textContent,/Amortization Term30 years/);w.state.interestOnly=true;w.state.mortRate=0;w.ReportBuilderV1.render();assert.match(w.document.querySelector('[data-rb-section="assumptions"]').textContent,/Loan Maturity30 years/);w.state.mortgage=0;w.ReportBuilderV1.render();assert.doesNotMatch(w.document.querySelector('[data-rb-section="assumptions"]').textContent,/Mortgage Assumptions/);}finally{w.close();}});
