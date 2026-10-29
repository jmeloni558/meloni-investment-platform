const test=require('node:test'),assert=require('node:assert/strict'),C=require('../operations/bpo/core.cjs');
const all=v=>C.draftSummary(C.recalculate(v)).sections.map(s=>s.title+' '+s.body).join('\n');
test('analysis explains comp differences without repeating adjustment dollars',()=>{
 const v={'sold.0.gla':'1800','sold.0.baths':'4','sold.0.pool':'Private','sold.0.quality':'Good / Block','sold.1.address':'101 Test Ave','sold.1.price':'500000','sold.1.gla':'1400','sold.1.baths':'2','sold.1.pool':'Above-ground','sold.1.quality':'Average / Frame','sold.1.adj_pool':'50000','sold.1.adj_quality':'20000',field_0477:'600000'};
 const s=all(v);assert.match(s,/less living area and fewer bathrooms/);assert.match(s,/above-ground pool is treated as having no pool value/);assert.match(s,/newer age alone does not establish superior/);assert.doesNotMatch(s,/pool \(\+|quality \(\+|The BPO adjusts for/);assert.match(s,/falls outside that range/);
});
test('pending and short-exposure listings never become completed sales or prolonged exposure',()=>{
 const s=all({'active.1.address':'102 Test Ave','active.1.price':'900000','active.1.source':'Pending listing','active.1.dom':'20',field_0053:'90'});
 assert.match(s,/Pending Comparable/);assert.match(s,/last asking price/);assert.match(s,/neither the contract price nor a completed closing/);assert.doesNotMatch(s,/extended exposure|sold for|greatest weight/);
});
test('missing facts do not produce comparison claims, trends or a guessed value',()=>{
 const s=all({'sold.1.address':'Sparse test comp','active.1.address':'Sparse listing'});assert.match(s,/do not yet explain/);assert.match(s,/not yet been finalized/);assert.doesNotMatch(s,/private pool|increasing inventory|declining market|boat lift|waterfront|updated condition/);
});
test('ambiguous quantities are flagged, numerical adjustment details remain available in analyst notes',()=>{
 const v={_summaryNotes:{subject:'Subject has a boat house with $70000 pound lift.','sold.1':'The unusual adjustment requires verification.'},'sold.1.address':'103 Test Ave'};
 const draft=C.draftSummary(v);assert.equal(draft.narrativeVersion,2);assert.ok(draft.warnings.length);assert.match(draft.sections[0].body,/capacity requires confirmation/);assert.doesNotMatch(draft.sections[0].body,/70000/);assert.match(draft.sections[2].body,/unusual adjustment requires verification/);
});
test('subject asking price comes from active section, never its prior sale price',()=>{
 const s=all({'sold.0.price':'100000','active.0.price':'300000',field_0477:'280000'});assert.match(s,/\$20,000 above/);assert.doesNotMatch(s,/\$180,000|\$100,000/);
});
