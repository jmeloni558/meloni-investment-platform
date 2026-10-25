const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
test('guidance explains optional evidence, handles sign-in changes and survives workspace rerenders',()=>{
 const dom=new JSDOM('<div id="ptHomeExperience"><section class="pt-home-starter"></section></div><div id="propertyhub"></div><section id="assumptions"></section><section id="report"><div id="clientReport">Customer report</div></section>',{runScripts:'outside-only'}),w=dom.window;
 try{
 w.cloudUser=null;w.eval(fs.readFileSync(path.join(__dirname,'../analysis-evidence-guidance.js'),'utf8'));
 const apply=w.PropertyThesisEvidenceGuidance.apply;apply();apply();
 assert.equal(w.document.querySelectorAll('#ptEvidenceOverview').length,1);
 assert.match(w.document.querySelector('#ptEvidenceOverview').textContent,/either type of comparable, both types, or neither/);
 assert.equal(w.document.querySelectorAll('#ptEvidenceOverview img').length,2);
 for(const img of w.document.querySelectorAll('#ptEvidenceOverview img')){assert.ok(img.alt);assert.equal(img.getAttribute('loading'),'lazy');assert.ok(fs.existsSync(path.join(__dirname,'..',img.getAttribute('src'))));}
 assert.equal(w.document.getElementById('ptEvidenceWorkspace').hidden,true);
 w.cloudUser={id:'test'};apply();assert.equal(w.document.getElementById('ptEvidenceWorkspace').hidden,false);
 assert.equal(w.document.querySelector('#clientReport').textContent,'Customer report');
 w.document.getElementById('propertyhub').innerHTML='';apply();assert.equal(w.document.querySelectorAll('#ptEvidenceWorkspace').length,1);
 w.cloudUser=null;apply();assert.equal(w.document.getElementById('ptEvidenceReport').hidden,true);
 }finally{w.close();}
});

