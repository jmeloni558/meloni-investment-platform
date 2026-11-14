'use strict';
const {PDFDocument,StandardFonts,rgb}=require('pdf-lib');
function fingerprint(v){const parts=[v._summaryNotes||{},Object.keys(v).filter(k=>!k.startsWith('_')).sort().map(k=>[k,v[k]])];if(v._clientTemplate==='fix-flip')parts.push(v._fixFlip||{});return JSON.stringify(parts);}
const text=x=>String(x??'').trim();
const cash=x=>text(x)?Number(String(x).replace(/[$,]/g,'')).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'not entered';
function includeFixFlipSummary(v,summary){
 if(v._clientTemplate!=='fix-flip')return summary;
 const f=v._fixFlip||{},F=require('./fix-flip.cjs').fixFlip;let body,conclusion;
 try{const r=F.calculate(f),scope=r.repairs.map(x=>x.scope.split(' - ')[0]).join('; ');
 body=`The repair estimate covers ${scope||'no budgeted repair work'}. The itemized subtotal is ${cash(r.subtotal.budget)}, plus ${f.contingency}% contingency of ${cash(r.contingency.budget)}, for a total repair budget of ${cash(r.total.budget)} (estimated range ${cash(r.total.low)} to ${cash(r.total.high)}). `;
 body+=f.photoStatus==='reviewed'?'Photo-review findings were supplied by the user or an external reviewer; PropertyThesis has not independently inspected the images. ':f.photoStatus==='inaccessible'?'Photos were inaccessible; the estimate uses user-provided repairs and allowances. ':f.photoStatus==='pending'?'Photo review is pending; no completed review is claimed. ':'No photos were supplied to this workflow; the estimate uses user-provided repairs and allowances. ';
 body+=[f.reviewNotes,f.assumptions].filter(Boolean).join(' ');
 conclusion=`Repair estimate reconciliation: The ${cash(r.total.budget)} repair budget, including contingency, should be considered alongside the subject's condition and the comparable-sale adjustments. It is a planning allowance, not an automatic dollar-for-dollar deduction from the as-is BPO opinion. At the entered resale assumption of ${cash(r.n.arv)} and ${r.n.selling}% selling costs, `+r.scenarios.filter(s=>s.available).map(s=>`${s.name.toLowerCase()} of ${cash(s.purchase)} yields ${cash(s.profit)} projected profit and ${s.roi.toFixed(2)}% project ROI (${s.meets?'meets':'below'} the ${r.n.target}% target)`).join('; ')+'. These returns use the entered acquisition, holding, financing and other costs; investment assumptions do not independently establish market value.';
 }catch(error){body='The repair estimate is incomplete: '+error.message+' No completed repair budget or ROI is asserted.';conclusion='Repair estimate reconciliation: The repair estimate remains incomplete. Finalize the scope, costs and investment assumptions before relying on repair totals or project returns.';}
 const sections=summary.sections.filter(s=>s.id!=='repairs'&&s.title!=='Repair Estimate Analysis').map(s=>({...s}));
 const index=sections.findIndex(s=>s.id==='conclusion'||/^(?:Value Reconciliation and )?Conclusion$/.test(s.title));
 if(index<0)throw Error('The summary is missing its conclusion.');
 sections[index].body=sections[index].body.split(/\n\s*\n/).filter(p=>!p.startsWith('Repair estimate reconciliation:')).join('\n\n')+'\n\n'+conclusion;
 sections.splice(index,0,{id:'repairs',title:'Repair Estimate Analysis',body});
 return {...summary,sections,source:fingerprint(v)};
}
function draft(v){const general=v._clientTemplate!=='rrr';return includeFixFlipSummary(v,{narrativeVersion:general?4:2,warnings:require('./summary-analysis.cjs').warnings(v),source:fingerprint(v),sections:require(general?'./summary-editorial.cjs':'./narrative.cjs').sections(v)});}
function acceptSynthesizedSummary(v,result){
 if(v._clientTemplate==='rrr'||result?.generation!=='ai-synthesis'||result.narrativeVersion!==5)throw Error('The summary writer returned an unexpected response. Your current draft is unchanged.');
 const baseline=draft(v),notes=require('./summary-notes.cjs').summaryNotes(v),ids=['subject','market',...['sold','active'].flatMap(k=>[1,2,3].filter(i=>text(v[k+'.'+i+'.address'])||text(notes[k+'.'+i])).map(i=>k+'.'+i)),'conclusion'];
 if(!Array.isArray(result.sections)||result.sections.length!==ids.length||result.sections.some((s,i)=>s.id!==ids[i]||typeof s.body!=='string'||!s.body.trim()||s.body.length>20000)||!Array.isArray(result.warnings)||result.warnings.some(w=>typeof w!=='string'))throw Error('The summary writer returned incomplete sections. Your current draft is unchanged.');
 return includeFixFlipSummary(v,{...baseline,narrativeVersion:5,generation:'ai-synthesis',reviewed:false,sections:baseline.sections.filter(s=>s.id!=='repairs').map((s,i)=>({...s,body:result.sections[i].body})),warnings:[...new Set([...baseline.warnings,...result.warnings])],incorporatedNotes:result.incorporatedNotes||[]});
}
function validate(v){const step=v._clientTemplate==='fix-flip'?8:7;if(!v._summary?.sections?.length)throw Error('Generate and review the BPO summary in Step '+step+' first.');if(v._summary.source!==fingerprint(v))throw Error('BPO facts changed after the summary was prepared. Review and confirm the summary against the current form in Step '+step+'.');}
async function summaryPDF(v){
 validate(v);if(v._summary.narrativeVersion>=3)return require('./summary-layout.cjs').render(v);const d=await PDFDocument.create(),font=await d.embedFont(StandardFonts.Helvetica),bold=await d.embedFont(StandardFonts.HelveticaBold),logo=await d.embedPng(require('../../assets/bpo/meloni-realty-logo.json').dataUri);let page,y;
 const clean=s=>String(s).replace(/[—–]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\u00a0/g,' ');
 function add(){page=d.addPage([612,792]);y=720;page.drawImage(logo,{x:48,y:751,width:111,height:111*logo.height/logo.width});const label='BROKER PRICE OPINION SUMMARY';page.drawText(label,{x:564-bold.widthOfTextAtSize(label,9),y:758,size:9,font:bold,color:rgb(.02,.18,.29)});page.drawLine({start:{x:48,y:746},end:{x:564,y:746},thickness:1,color:rgb(.72,.55,.19)});}
 function lines(t,f,size){const out=[];for(const paragraph of clean(t).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(!word)continue;if(f.widthOfTextAtSize(word,size)>516)throw Error('A summary word or URL is too long to fit. Shorten it before export.');if(line&&f.widthOfTextAtSize(line+' '+word,size)>516){out.push(line);line=word;}else line+=(line?' ':'')+word;}out.push(line);}return out;}
 function draw(t,f,size,leading){for(const line of lines(t,f,size)){if(y<58)add();if(line)page.drawText(line,{x:48,y,size,font:f});y-=leading;}}
 add();draw('Broker Price Opinion Summary',bold,19,25);draw(v.field_0008||'Subject property',bold,12,18);
 draw(`BPO date: ${v.field_0002||'Not entered'}   |   Prepared by: ${v.field_0018||v.field_0009||'Not entered'}`,font,10,15);if(v.field_0015)draw(v.field_0015,font,10,15);
 draw(`As-is value: ${cash(v.field_0477)}   |   Recommended list: ${cash(v.field_0478)}`,font,10,15);y-=12;
 for(const s of v._summary.sections){const body=lines(s.body,font,11);const needed=24+body.length*15+12;if(y<115||(needed<640&&y-needed<58))add();draw(s.title,bold,12,18);y-=4;draw(s.body,font,11,15);y-=14;}
 d.getPages().forEach((p,i)=>p.drawText(`BPO Summary  |  ${i+1} / ${d.getPageCount()}`,{x:48,y:30,size:9,font,color:rgb(.35,.4,.45)}));return d.save();
}
async function mergePackage(bpo,summary,attachments){const d=await PDFDocument.load(bpo);for(const a of [{name:'BPO Summary',bytes:summary},...attachments]){let src;try{src=await PDFDocument.load(a.bytes);}catch(_){throw Error(`Cannot read ${a.name}. Supply an unencrypted, valid PDF.`);}if(src.getForm().getFields().length)throw Error(`${a.name} contains interactive fields. Supply a separate static copy for the supporting-document package; the original remains unchanged.`);for(const p of await d.copyPages(src,src.getPageIndices()))d.addPage(p);}return d.save();}
module.exports={...require('./summary-notes.cjs'),includeFixFlipSummary,summaryFingerprint:fingerprint,draftSummary:draft,acceptSynthesizedSummary,validateSummary:validate,summaryPDF,mergePackage};
