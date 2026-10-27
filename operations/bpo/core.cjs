'use strict';
const schema=require('../../assets/bpo/fields.json');
const {PDFDocument,StandardFonts,rgb,layoutMultilineText}=require('pdf-lib');
const byName=new Map(schema.map(f=>[f.name,f]));
function number(v){if(v===null||v===undefined||String(v).trim()==='')return null;const s=String(v).trim().replace(/[$,]/g,'');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;const n=Number(s);return Number.isFinite(n)?n:null;}
function money(n){return Number(n).toLocaleString('en-US',{maximumFractionDigits:2});}
function recalculate(input){const v={...input};for(const kind of ['sold','active'])for(let i=0;i<4;i++){
 const p=`${kind}.${i}.`,price=number(v[p+'price']),gla=number(v[p+'gla']);v[p+'ppsf']=price!==null&&gla>0?money(price/gla):'';
 if(i){const fs=schema.filter(f=>f.name.startsWith(p+'adj_'));let sum=0,invalid=false;for(const f of fs){const x=v[f.name];if(x!==undefined&&String(x).trim()!==''){const n=number(x);if(n===null)invalid=true;else sum+=n;}}v[p+'net']=invalid||(price===null&&!fs.some(f=>String(v[f.name]??'').trim()))?'':money(sum);v[p+'adjusted']=!invalid&&price!==null?money(price+sum):'';}
 }let total=0,invalid=false;for(let i=0;i<10;i++){const x=v[`repair.${i}.cost`];if(x!==undefined&&String(x).trim()!==''){const n=number(x);if(n===null||n<0)invalid=true;else total+=n;}}v['repair.total']=invalid?'':money(total);return v;}
const groups=[[4,5,6,7],[23,24,25,26,27],[28,29,30],[33,36,37],[40,41,42],[49,50,51],[56,57],[60,61],[64,65,66,67,68,69,70,71,72],[74,75],[259,260,261],[262,263]].map(g=>g.map(n=>'field_'+String(n).padStart(4,'0')));
const calculated=n=>/\.(ppsf|net|adjusted)$/.test(n)||n==='repair.total';
function issues(v){const errors=[];for(const g of groups){if(g.filter(n=>v[n]===true).length>1)errors.push('Select only one option for '+byName.get(g[0]).label+'.');}for(const f of schema){const x=v[f.name];if(x!==undefined&&String(x).trim()!==''&&(f.name.includes('.adj_')||/\.(price|cost|gla)$/.test(f.name)||['field_0477','field_0478','field_0479','field_0480'].includes(f.name))){const n=number(x);if(n===null||(!f.name.includes('.adj_')&&n<0))errors.push(f.label+': enter a valid '+(f.name.includes('.adj_')?'signed ':'nonnegative ')+'number.');}}return errors;}
function applyRecord(values,record,target){const v={...values};const set=(k,value)=>{if(value!==undefined&&value!==null&&String(value).trim()!=='')v[k]=String(value);};const keys=['address','price','gla','beds','baths','rooms','year','site','date','dom','source','garage','pool','hvac','design','tenure'];if(target==='subject'){
 set('field_0008',record.address);for(const kind of ['sold','active'])for(const key of keys)set(`${kind}.0.${key}`,record[key]);
 }else for(const key of keys)set(target+'.'+key,record[key]);return recalculate(v);}
function listingRecord(l){return {address:l.formattedAddress||l.addressLine1,price:l.price,gla:l.squareFootage,beds:l.bedrooms,baths:l.bathrooms,year:l.yearBuilt,site:l.lotSize?`${l.lotSize} sq ft`:undefined,dom:l.daysOnMarket,design:l.propertyType,source:'RentCast listing'+(l.mlsNumber?' / MLS '+l.mlsNumber:'')};}
// Only labeled facts are extracted. No inferred adjustments, market conditions or value opinion.
function parseMLS(text){const t=String(text).replace(/\r/g,'');const headers=[...t.matchAll(/^\s*(?:[A-Z]{1,3}\d{6,12}\s+)?(\d+[A-Z]?\s+[^\n]{5,110})$/gm)].filter(m=>/\b(?:ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|LN|LANE|CT|COURT|WAY|BLVD|CIR|PL|PLACE|TRAIL|TER|TERRACE)\b/i.test(m[1]));
 const blocks=headers.length?headers.map((h,i)=>({address:h[1].trim(),text:t.slice(h.index,headers[i+1]?.index||t.length)})):[{address:'',text:t}];
 return blocks.slice(0,30).map(b=>{const s=b.text;const pick=(re)=>s.match(re)?.[1]?.trim();return {address:b.address||pick(/(?:Property Address|Address)\s*:\s*([^\n]+)/i)||'',price:pick(/(?:Sold Price|Sale Price|Close Price|Closed Price)\s*:\s*\$?([\d,]+(?:\.\d+)?)/i)||pick(/(?:List Price|LP)\s*:\s*\$?([\d,]+(?:\.\d+)?)/i)||'',status:pick(/Status\s*:\s*(Closed|Sold|Active|Pending|Withdrawn|Expired)/i)||'',gla:pick(/(?:Heated Area|SqFt Heated|Heated SqFt|Living Area|Sq Ft Heated)\s*:\s*([\d,]+)/i)||'',beds:pick(/(?:Beds|Bedrooms)\s*:\s*(\d+)/i)||'',baths:pick(/(?:Baths|Bathrooms)\s*:\s*(\d+(?:\.\d+)?)/i)||'',year:pick(/Year Built\s*:\s*(\d{4})/i)||'',date:pick(/(?:Sold Date|Close Date|Closed Date)\s*:\s*([\d/.-]+)/i)||'',dom:pick(/(?:ADOM|Days on Market|DOM)\s*:\s*(\d+)/i)||'',source:'Stellar MLS (uploaded PDF)',excerpt:s.slice(0,18000)};});}
async function exportPDF(template,values){const errors=issues(values);if(errors.length)throw Error(errors[0]);const v=recalculate(values),doc=await PDFDocument.load(template),form=doc.getForm(),font=await doc.embedFont(StandardFonts.Helvetica);if(doc.getPageCount()!==2)throw Error('BPO template must have exactly two pages.');
 for(const f of schema){const page=doc.getPage(f.page);if(f.kind==='check'){const c=form.createCheckBox(f.name);c.addToPage(page,{x:f.x,y:f.y,width:f.w,height:f.h,borderWidth:0.4,borderColor:rgb(.5,.6,.65)});if(v[f.name]===true)c.check();continue;}
 const control=form.createTextField(f.name);control.setText(String(v[f.name]??''));if(f.kind==='textarea')control.enableMultiline();control.addToPage(page,{x:f.x,y:f.y,width:f.w,height:f.h,borderWidth:0,textColor:rgb(.06,.12,.18)});
 let size=Math.min(8,f.h-2);const text=String(v[f.name]??'');
 const fits=()=>{if(f.kind==='textarea'){const l=layoutMultilineText(text,{alignment:0,fontSize:size,font,bounds:{x:0,y:0,width:f.w-4,height:f.h-4}});return l.lines.every(x=>x.y>=0&&x.width<=f.w-4);}return font.widthOfTextAtSize(text,size)<=f.w-4;};
 try{while(size>4&&!fits())size=Math.max(4,size-.25);if(!fits())throw Error('overflow');}catch(e){throw Error(f.label+': shorten this entry or replace unsupported characters to fit the printed form.');}
 control.setFontSize(size);if(calculated(f.name))control.enableReadOnly();
 }form.updateFieldAppearances(font);doc.setTitle('Residential Broker Price Opinion');doc.setProducer('PropertyThesis BPO');return doc.save();}
function applyAI(input,result){
 const v={...input},sources={...(input._aiFields||{})},warnings=[...(result.warnings||[])];let applied=0,preserved=0;
 const entries=Array.isArray(result.fields)?result.fields:[],addresses=new Map(entries.filter(e=>/^(sold|active)\.[1-3]\.address$/.test(e.name)).map(e=>[e.name.replace(/\.address$/,''),e.value]));
 const normalize=x=>String(x??'').toLowerCase().replace(/[^a-z0-9]/g,'');
 for(const e of entries){const f=byName.get(e.name);if(!f||calculated(e.name)||e.name.includes('.adj_')||e.name.startsWith('repair.')||['field_0477','field_0478','field_0479','field_0480','field_0483','field_0484'].includes(e.name))continue;
  const prefix=e.name.match(/^(sold|active)\.[1-3]/)?.[0];if(prefix){const old=input[prefix+'.address'],incoming=addresses.get(prefix);if(!incoming||(old&&normalize(old)!==normalize(incoming))){preserved++;continue;}}
  const current=v[e.name],old=sources[e.name];if(current!==undefined&&current!==''&&current!==false&&current!==e.value&&(!old||old.value!==current)){preserved++;continue;}
  if(e.value===true){const group=groups.find(g=>g.includes(e.name));if(group?.some(n=>n!==e.name&&v[n]===true)){preserved++;continue;}}
  if(e.value!==''&&e.value!==null&&e.value!==undefined){v[e.name]=e.value;sources[e.name]={value:e.value,path:e.path,filename:e.filename,page:e.page,evidence:e.evidence};applied++;}
 }
 if(preserved)warnings.push(`${preserved} proposed fields were left unchanged to preserve your entries or existing comparable identities.`);
 v._aiFields=sources;v._aiReview={at:new Date().toISOString(),warnings,applied};return {values:recalculate(v),applied,preserved,warnings};
}
module.exports={schema,byName,groups,number,money,recalculate,calculated,issues,applyRecord,listingRecord,parseMLS,exportPDF,applyAI};
