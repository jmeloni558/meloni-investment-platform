'use strict';
const clean=v=>String(v??'').trim();
const combine=(...parts)=>[...new Set(parts.map(clean).filter(Boolean))].join('\n\n');
function summaryNotes(values){
 const notes={...(values._summaryNotes||{})};if(values._clientTemplate==='rrr')return notes;
 notes.subject=combine(notes.subject,notes.risks);notes.market=combine(notes.market,notes.competition);
 for(const [reason,selection,prefix] of [['primaryReason','primary','sold'],['primaryActiveReason','primaryActive','active']]){
  const selected=notes[selection]||(/Comp [1-3]$/.test(values[prefix==='sold'?'primary_sold_comp':'primary_active_comp']||'')?prefix+'.'+values[prefix==='sold'?'primary_sold_comp':'primary_active_comp'].slice(-1):'');
  if(selected)notes[selection]=selected;
  if(clean(notes[reason])){if(new RegExp('^'+prefix+'\\.[1-3]$').test(selected))notes[selected]=combine(notes[selected],notes[reason]);else notes.conclusion=combine(notes.conclusion,(prefix==='sold'?'Primary sold comparable: ':'Primary active / pending comparable: ')+clean(notes[reason]));}
  delete notes[reason];
 }
 delete notes.risks;delete notes.competition;return notes;
}
module.exports={summaryNotes};
