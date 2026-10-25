'use strict';
const {createPdf}=require('./pdf-report.cjs');

// Read the reviewed report DOM, not mutable calculator fields or a second model.
function reportModel(source,profile={}){
 const blocks=[];
 const clean=node=>{
  if(!node)return '';
  if(node.nodeType===3)return String(node.textContent||'').replace(/\s+/g,' ').trim();
  return [...(node.childNodes||[])].map(clean).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
 };
 let heading='Report table';
 function visit(el){
  if(el.nodeType!==1||el.style?.display==='none'||el.hidden||el.getAttribute('aria-hidden')==='true'||['SCRIPT','STYLE','BUTTON','INPUT','SELECT'].includes(el.tagName))return;
  if(el.classList.contains('rb-cover')||el.classList.contains('pt-report-product'))return;
  if(el.classList.contains('rb-footer')){
   const copy=el.cloneNode(true);copy.querySelectorAll('.pt-report-product').forEach(node=>node.remove());
   const note=clean(copy);if(note)blocks.push({kind:'disclaimer',text:note});
   return;
  }
  if(el.classList.contains('rb-two')&&el.closest('[data-rb-section="assumptions"]')){
   const columns=[...el.children].map(panel=>{
    const entries=[{title:clean(panel.querySelector('h3'))}];
    let rents=false;
    for(const row of panel.querySelectorAll('.rb-row,h4')){
     if(row.tagName==='H4'){if(clean(row)==='Mortgage Assumptions')entries.push({title:clean(row)});continue;}
     const label=clean(row.children[0]),value=clean(row.children[1]).replace(/(\d+)\.(\d+)/g,(_,whole,decimal)=>whole+(decimal.replace(/0+$/,'')?'.'+decimal.replace(/0+$/,''):''));
     const isRent=/^(Units \/ Apartments|Unit \d+ Monthly Rent|Monthly Rent|Total Monthly Rent)$/.test(label);
     if(isRent&&!rents){entries.push({title:'Units & Monthly Rents'});rents=true;}
     if(!isRent&&rents){entries.push({title:'Operating Assumptions'});rents=false;}
     entries.push({label,value});
    }
    return entries;
   });
   blocks.push({kind:'columns',columns});return;
  }
  if(/^H[1-6]$/.test(el.tagName)){heading=clean(el);blocks.push({kind:'heading',text:heading});return;}
  if(el.tagName==='TABLE'){
   let rows=[...el.querySelectorAll('tr')].map(tr=>[...tr.children].map(clean));
   if(rows[0]?.length>7||rows[0]?.[0]==='Cash Flow Component'){
    // A year matrix becomes a year-per-row schedule; no squeezed 40-column pages.
    rows=rows[0].map((_,i)=>rows.map(row=>row[i]||''));
   }
   if(rows.length){const labels={PGI:'Gross income',EGI:'After vacancy',NOI:'Net operating income','After-Tax CF':'After-tax cash flow',GLA:'Area (sq ft)',SF:'Sq ft'};rows[0]=rows[0].map(v=>labels[v]||v);}
   if(rows.length)blocks.push({kind:'table',heading,rows});return;
  }
  if(el.classList.contains('rb-stats')||el.classList.contains('rb-findings-grid')){
   const cards=[...el.children].filter(c=>!c.hidden&&c.style.display!=='none').map(c=>[clean(c.children[0]),[...c.children].slice(1).map(clean).filter(Boolean).join(' - ')]);
   if(cards.length)blocks.push({kind:'cards',items:cards});return;
  }
  if(el.classList.contains('rb-stat')||el.classList.contains('rb-row')){
   const values=[...el.children].map(clean).filter(Boolean);
   if(values.length)blocks.push({kind:'text',text:values.join(': ')});return;
  }
  if(['P','LI'].includes(el.tagName)||!el.children.length){const text=clean(el);if(text)blocks.push({kind:'text',text});return;}
  // Preserve inline-only text as one sentence; structural descendants remain ordered.
  if([...el.children].every(c=>['SPAN','B','STRONG','EM','I','A','BR','SMALL'].includes(c.tagName))){const text=clean(el);if(text)blocks.push({kind:'text',text});return;}
  for(const child of el.childNodes){if(child.nodeType===3&&clean(child))blocks.push({kind:'text',text:clean(child)});else visit(child);}
 }
 const cover=source.querySelector('.rb-cover');
 const title=clean(cover?.querySelector('.address'))||'Property analysis';
 for(const text of [profile.company_name,[profile.full_name,profile.professional_title,profile.license_number].filter(Boolean).join(' | '),[profile.email,profile.phone,profile.website].filter(Boolean).join(' | ')])if(text)blocks.push({kind:'identity',text});
 const meta=clean(cover?.querySelector('.pt-header-meta')||cover?.querySelector('.rb-meta'));
 // Identity belongs in the header, not repeated in the body.

 for(const el of source.children)visit(el);
 return {title,address:meta,clientLayout:true,releaseReport:true,brandColor:profile.brand_color,blocks};
}
async function build(source,profile,fontBytes){
 const model=reportModel(source,profile);
 const logo=source.querySelector('.pt-user-side img');
 if(logo&&typeof Image!=='undefined'){
  const image=new Image();image.crossOrigin='anonymous';
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Report logo could not load. Please retry.')),15000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('Report logo could not load. Please retry.'));};image.src=logo.src;});
  const canvas=source.ownerDocument.createElement('canvas');const scale=Math.min(1,600/image.naturalWidth,300/image.naturalHeight);canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  model.blocks.unshift({kind:'logo',data:canvas.toDataURL('image/png')});
 }
 return createPdf(model,fontBytes);
}
if(typeof window!=='undefined')window.PropertyThesisTextPdf={build,reportModel};
module.exports={build,reportModel};
