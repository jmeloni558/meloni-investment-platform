const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../operations/bpo/core.cjs');
const modules=Promise.all([import('../supabase/functions/bpo-summary/editorial.mjs'),import('../supabase/functions/bpo-summary/contract.mjs'),import('../supabase/functions/bpo-extract/contract.mjs'),import('../supabase/functions/bpo-generate/completion.mjs')]);
test('Laquinta checkbox/source disagreement cannot become an active REO narrative',async()=>{
 const [e,s]=await modules,v={_clientTemplate:'general','active.2.address':'10816 Laquinta Dr','active.2.reo':true,_aiFields:{'active.2.reo':{value:false,evidence:'Ownership: Fee Simple — no REO/corporate ownership indicated'}}};
 const input=s.prepare(v,C.schema);assert.equal(input.ownershipEvidence['active.2'].reo,false);assert.equal(input.ownershipEvidence['active.2'].conflict,true);assert.ok(!input.facts.some(f=>f.key==='active.2.reo'));
 for(const id of ['active.2','conclusion'])assert.throws(()=>e.validateEditorial([{id,body:'The active REO comp can affect buyer perception.'}],input),/unsupported REO/);
 assert.doesNotThrow(()=>e.validateEditorial([{id:'active.2',body:'Its lower asking price gives buyers an alternative, while the subject’s updated interior and pond view help explain its higher price.'}],input));
});
test('company ownership, combined flags and missing evidence never prove REO; genuine REO stays property-specific',async()=>{
 const [e]=await modules;for(const quote of ['REO / corporate owned: Yes','Owner: Example LLC','Ownership: Fee Simple','Special Sale: None','Bank-owned: No','This property is not bank-owned.'])assert.equal(e.ownershipSupport(quote).reo,false,quote);
 const input={ownershipEvidence:e.ownershipEvidence({'sold.1.reo':true,'active.1.reo':true,_aiFields:{'sold.1.reo':{value:true,evidence:'Special Sale: REO / Bank Owned'},'active.1.reo':{value:true,evidence:'Corporate-owned: Yes'}}})};
 assert.equal(input.ownershipEvidence['sold.1'].reo,true);assert.equal(input.ownershipEvidence['active.1'].corporate,true);assert.equal(input.ownershipEvidence['active.1'].reo,false);
 assert.doesNotThrow(()=>e.validateEditorial([{id:'sold.1',body:'This bank-owned sale provides a closed transaction for comparison.'}],input));assert.throws(()=>e.validateEditorial([{id:'active.1',body:'This is an REO listing.'}],input),/unsupported REO/);
});
test('extraction accepts explicit negative and genuine ownership evidence, rejects false positive and absent evidence',async()=>{
 const [,,extract]=await modules,docs=[{category:'active',path:'active.pdf'}];
 for(const [value,evidence,count] of [['true','Special Sale: None',0],['true','Ownership: Fee Simple',0],['true','Owner: Investment LLC',0],['false','REO not mentioned',0],['false','Special Sale: None',1],['true','Special Sale: REO / Bank Owned',1],['true','Corporate-owned: Yes',1]]){
  const r=extract.cleanExtraction({fields:[{name:'active.2.reo',value,evidence,document:0,page:1}]},C.schema,docs,{general:true});assert.equal(r.fields.length,count,evidence);
 }
});
test('AI form completion rechecks existing flags and requires an ownership quote',async()=>{
 const [,,,c]=await modules,plan=c.completionPlan({'active.2.address':'Test','active.2.reo':true,_aiFields:{'active.2.reo':{value:true,evidence:'Owner LLC'}}},C.schema);
 assert.ok(plan.fields.some(f=>f.name==='active.2.reo'));assert.ok(c.evidenceNames(plan).includes('active.2.reo'));
 const small={fields:plan.fields.filter(f=>['active.2.reo','field_0482'].includes(f.name)),choices:[],active:['active.2']};
 const result=quote=>({formFields:{'active.2.reo':true,field_0482:'Closed sales support the selected value.'},formEvidence:{'active.2.reo':quote},choices:{},primaryActive:'active.2',repairs:[],repairStatus:'unknown'});
 assert.throws(()=>c.validateCompletion(result('Special Sale: None'),small),/explicit affirmative/);assert.throws(()=>c.validateCompletion(result(null),small),/explicit affirmative/);assert.equal(c.validateCompletion(result('Special Sale: REO / Bank Owned'),small).formFields['active.2.reo'],true);
});
test('boilerplate triggers a rewrite, while direct qualified analysis and material adjustment discussion remain allowed',async()=>{
 const [e]=await modules;for(const body of ['Condition is reported as Good.','It is reported in Average condition.','The observation records updating.','The grid applies $10,000 for condition.'])assert.throws(()=>e.validateEditorial([{id:'subject',body}],{}),/natural broker prose/);
 assert.doesNotThrow(()=>e.validateEditorial([{id:'sold.1',body:'The similar layout makes this the strongest comparison. Its dated interior explains the $10,000 condition adjustment and supports placing the subject above its sale price. The interior condition still needs confirmation.'}],{}));
 const full=await import('../supabase/functions/bpo-generate/contract.mjs'),summary=await import('../supabase/functions/bpo-summary/contract.mjs');for(const instructions of [full.instructions,summary.instructions]){assert.ok(instructions.includes(e.editorialInstructions));assert.match(instructions,/structured adjustment records/);assert.match(instructions,/Do not walk through every/);}
});
