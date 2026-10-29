'use strict';
const norm=s=>String(s||'').toUpperCase().replace(/\bSTREET\b/g,'ST').replace(/\bDRIVE\b/g,'DR').replace(/\bAVENUE\b/g,'AVE').replace(/\bROAD\b/g,'RD').replace(/[^A-Z0-9]/g,'');
function unique(text,re,convert=x=>x.trim()){
 const values=[...text.matchAll(re)].map(m=>convert(m[1])).filter(x=>x!==null&&x!==undefined&&x!=='');
 const set=[...new Set(values)];return set.length===1?set[0]:undefined;
}
function style(value){const s=String(value||'').trim().toLowerCase();return /^(one|1|single)(?:[ -](?:story|storey|level))?$/.test(s)||s==='ranch'?'Rambler/Ranch':/^(two|2)(?:[ -](?:story|storey|level))?$/.test(s)?'2 Story':undefined;}
function pool(value,features=''){
 const s=String(value||'').trim().toLowerCase(),f=String(features||'').toLowerCase();
 if(/^(none|no|community|above[ -]ground)$/.test(s))return 'No';
 if(/private/.test(s)&&/in[ -]?ground/.test(s+' '+f)&&!/above[ -]?ground/.test(s+' '+f))return 'Yes';
 if(/above[ -]?ground/.test(s+' '+f)&&!/in[ -]?ground/.test(s+' '+f))return 'No';
 return undefined;
}
function parse(text,category){
 const t=String(text||'').replace(/\r/g,'');
 const headers=[...t.matchAll(/\b([A-Z]{1,4}\d{5,12})[ \t]+(\d[\d \t]*[A-Za-z][^\n]+?,[^\n]+?\b[A-Z]{2}[ \t]+\d{5}(?:-\d{4})?)/g)];
 return headers.map((h,i)=>{
  const b=t.slice(h.index,headers[i+1]?.index||t.length);
  const special=unique(b,/Special Sale:\s*(None|REO\s*\/\s*Bank Owned|Bank Owned|REO|Short Sale|Probate Listing|Estate|Relocation|Non-Arms Length)\b/gi,x=>x.toLowerCase());
  const saleType=special===undefined?undefined:({none:'Arms Length','short sale':'Short Sale',estate:'Estate Sale',relocation:'Relocation Sale','non-arms length':'Non-Arms Length'}[special]||(/reo|bank owned/.test(special)?'REO':undefined));
  const financing=unique(b,/(?<![A-Za-z])Terms:[ \t]*([^\n]*)/gi,x=>({conventional:'Conventional',fha:'FHA',cash:'Cash',va:'VA','owner financing':'Owner-financed',usda:'USDA-Rural','usda-rural':'USDA-Rural','usda rural':'USDA-Rural'}[x.split(/Seller Credit:|Sold Date:/i)[0].trim().toLowerCase()]));
  const p=unique(b,/(?<![A-Za-z])Pool:\s*(None|No|Community|Private|Above Ground)\b/gi,x=>x.toLowerCase());
  const features=unique(b,/Pool Features:[ \t]*([^\n]*)/gi)||'';
  return {mls:h[1].toUpperCase(),address:h[2],category,
   originalPrice:unique(b,/Original (?:List )?Price:\s*\$?([\d,]+(?:\.\d+)?)/gi,x=>Number(x.replace(/,/g,''))),
   originalDate:unique(b,/(?:On Market|Original List) Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi),
   style:unique(b,/Floors in Unit\/Home:\s*(One|Two|1|2)\b/gi,style),pool:pool(p,features),saleType,financing:category==='sold'?financing:undefined};
 });
}
function matching(rows,v,prefix){
 const group=prefix.split('.')[0],subject=prefix.endsWith('.0.');
 const ids=[...String(v[prefix+'source']||'').matchAll(/\b[A-Z]{1,4}\d{5,12}\b/gi)].map(m=>m[0].toUpperCase());
 const address=norm(v[prefix+'address']),zip=norm(v[prefix+'zip']);
 const found=rows.filter(r=>r.category===(subject?'subject':group)&&((ids.length!==1||r.mls===ids[0])&&address.length>=8&&norm(r.address.split(',')[0])===address&&(!zip||norm(r.address).endsWith(zip))));
 if(!found.length)return {};
 const result={};for(const key of ['originalPrice','originalDate','style','pool','saleType','financing']){const vals=[...new Set(found.map(r=>r[key]).filter(x=>x!==undefined))];if(vals.length===1)result[key]=vals[0];}
 return result;
}
module.exports={parse,matching,style,pool};
