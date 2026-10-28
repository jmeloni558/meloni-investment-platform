'use strict';
const {PDFDocument,StandardFonts,layoutMultilineText}=require('pdf-lib');
function splitAddress(raw){const s=String(raw||'').trim();const m=s.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:,?\s*(?:USA|US))?$/i);return m?{address:m[1],city:m[2],state:m[3].toUpperCase(),zip:m[4]}:{address:s};}
function normalize(input){const v={...input};
 if(input._adjustments){v._adjustments=structuredClone(input._adjustments);const parts=v._adjustments.parts||{};for(const [key,obj] of Object.entries(parts)){if(key.endsWith('.porches')&&obj.fireplace!==undefined){parts[key.replace(/porches$/,'fireplace')]={fireplace:obj.fireplace};delete obj.fireplace;}if(key.endsWith('.pool')&&obj.fence!==undefined){parts[key.replace(/pool$/,'fence')]={fence:obj.fence};delete obj.fence;}}}

 for(const p of ['sold','active'])for(let i=0;i<=3;i++){const b=p+'.'+i+'.',a=splitAddress(v[b+'address']);for(const k of ['city','state','zip'])if(v[b+k]===undefined&&a[k])v[b+k]=a[k];if(a.city)v[b+'address']=a.address;}
 for(const [k,old] of [['city','field_0011'],['state','field_0012'],['zip','field_0013']])for(const p of ['sold','active'])if(v[p+'.0.'+k]===undefined&&v[old]!==undefined)v[p+'.0.'+k]=v[old];
 if(v.market_price_change_percent===undefined){const old=v.field_0033===true?'field_0031':v.field_0036===true?'field_0034':null;if(old){v.market_price_change_percent=v[old]??'';v.market_price_change_months=v[old==='field_0031'?'field_0032':'field_0035']??'';}}
 for(const [name,key,prefix] of [['primary_sold_comp','primary','sold'],['primary_active_comp','primaryActive','active']])if(v[name]===undefined&&v._summaryNotes?.[key])v[name]='Comp '+v._summaryNotes[key].split('.').pop();
 for(const p of ['sold','active']){v[p+'.0.distance']='N/A';v[p+'.0.financing']='N/A';}
 return v;}
function primaryOptions(v,p){return [{value:'',label:'None selected'},...[1,2,3].map(i=>({value:'Comp '+i,label:'Comp '+i+' - '+(v[p+'.'+i+'.address']||'address not entered')}))];}
function currencyField(f){return /(?:_adjustment|adjusted_price|\.price|\.ppsf|\.concessions|\.cost)$/.test(f.pdfName)||/^(?:value_|list_)/.test(f.pdfName)||/median_(home_value|list_price)$/.test(f.pdfName)||['repairs_total','subject_value_low','subject_value_high','subject_previous_list_price'].includes(f.pdfName);}
function formatValue(f,value){if(f.kind==='check')return value===true;const text=String(value??'');const n=Number(text.replace(/[$,]/g,''));return text.trim()&&Number.isFinite(n)&&currencyField(f)?n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):text;}
async function exportPDF(template,input,schema,recalculate,issues,concession){
 const v=recalculate(normalize(input));const errors=issues(v);if(errors.length)throw Error(errors[0]);
 const doc=await PDFDocument.load(template),form=doc.getForm(),font=await doc.embedFont(StandardFonts.Helvetica);if(doc.getPageCount()!==2)throw Error('The approved BPO form must contain two pages.');
 const filled=new Set();
 for(const f of schema){const n=f.pdfName;if(filled.has(n))continue;filled.add(n);let value=v[f.name];const control=form.getField(n);
 if(f.option){const selected=schema.filter(x=>x.pdfName===n&&v[x.name]===true);if(selected.length)control.select(selected[0].option);else control.clear();form.markFieldAsClean(control.ref);continue;}
 if(f.kind==='check'){if(value===true)control.check();else control.uncheck();form.markFieldAsClean(control.ref);continue;}
 if(f.kind==='select'){const p=f.name==='primary_sold_comp'?'sold':'active';const opts=primaryOptions(v,p);control.acroField.setDefaultAppearance('/Helv 8 Tf 0 g');control.setOptions(opts.map(o=>o.label));const label=opts.find(o=>o.value===(value||''))?.label||'None selected';control.select(label);continue;}
 if(/\.0\.(distance|financing)$/.test(f.name))value='N/A';
 if(!/\.0\./.test(f.name)&&/\.financing$/.test(f.name)&&String(value??'').trim()){
  const numeric=String(value).replace(/[$,\s]/g,'');if(!/^\d+$/.test(numeric)){const c=concession(value,Number(String(v[f.name.replace(/financing$/,'price')]||'').replace(/,/g,'')));value=c.amount===undefined?'':String(c.amount);}
 }
 value=formatValue(f,value);control.removeMaxLength();control.acroField.setDefaultAppearance('/Helv 8 Tf 0 g');control.setText(String(value??''));let size=Math.min(8,f.h-2);const text=String(value??'');if(f.kind==='textarea'){while(size>6&&layoutMultilineText(text,{font,fontSize:size,bounds:{x:0,y:0,width:f.w-4,height:f.h-4}}).lines.length*size*1.2>f.h-4)size-=.25;if(layoutMultilineText(text,{font,fontSize:size,bounds:{x:0,y:0,width:f.w-4,height:f.h-4}}).lines.length*size*1.2>f.h-4)throw Error(f.label+': shorten this entry before PDF export.');}else{while(size>6&&font.widthOfTextAtSize(text,size)>f.w-4)size-=.25;if(font.widthOfTextAtSize(text,size)>f.w-4)throw Error(f.label+': shorten this entry before PDF export.');}control.setFontSize(size);if(f.readonly)control.enableReadOnly();
 }
 form.updateFieldAppearances(font);
 // Restore stable export IDs after adding human-readable dropdown labels.
 const {PDFName,PDFString}=require('pdf-lib');
 for(const [name,p] of [['primary_sold_comp','sold'],['primary_active_comp','active']]){
  const field=form.getDropdown(name),opts=primaryOptions(v,p);
  field.acroField.dict.set(PDFName.of('Opt'),doc.context.obj(opts.map(o=>[PDFString.of(o.value),PDFString.of(o.label)])));
  field.acroField.dict.set(PDFName.of('V'),PDFString.of(v[name]||''));
 }
 doc.setTitle('Residential Broker Price Opinion');doc.setProducer('PropertyThesis BPO v14');return doc.save({updateFieldAppearances:false});
}
module.exports={formatValue,currencyField,normalize,splitAddress,primaryOptions,exportPDF};
