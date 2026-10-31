'use strict';
const {PDFDocument,StandardFonts,rgb}=require('pdf-lib');
const {date,titleCase}=require('./summary-editorial.cjs');
const clean=s=>String(s??'').replace(/[—–�]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\u00a0/g,' ');
const cash=x=>String(x??'').trim()?Number(String(x).replace(/[$,]/g,'')).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'Not entered';
async function render(v){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold),logo=await doc.embedPng(require('../../assets/bpo/meloni-realty-logo.json').dataUri);let page,y;
 const left=72,right=540,width=468,bottom=64,leading=17,size=12;
 function add(){page=doc.addPage([612,792]);page.drawImage(logo,{x:left,y:748,width:100,height:100*logo.height/logo.width});y=716;}
 function wrap(text,f=font,pt=size){const lines=[];for(const p of clean(text).split('\n')){let line='';for(const w of p.split(/\s+/).filter(Boolean)){if(f.widthOfTextAtSize(w,pt)>width)throw Error('A summary word or URL is too long to fit. Shorten it before export.');if(line&&f.widthOfTextAtSize(line+' '+w,pt)>width){lines.push(line);line=w;}else line+=(line?' ':'')+w;}lines.push(line);}return lines;}
 function paragraph(text,{f=font,pt=size,gap=9,keep=0}={}){const lines=wrap(text,f,pt);if(y-bottom<Math.min(lines.length,8)*leading+keep)add();let index=0;while(index<lines.length){let count=Math.floor((y-bottom)/leading)+1;if(count<1||(count<2&&lines.length-index>1)){add();continue;}count=Math.min(count,lines.length-index);if(lines.length-index-count===1&&count>1)count--;for(let j=0;j<count;j++){if(lines[index])page.drawText(lines[index],{x:left,y,size:pt,font:f});index++;y-=leading;}if(index<lines.length)add();}y-=gap;}
 function heading(text,pt=12,keep=48){const height=wrap(text,bold,pt).length*leading+8;if(y-bottom<height+keep)add();paragraph(text,{f:bold,pt,gap:8,keep});}
 add();heading('Broker Price Opinion Summary',16,130);
 const metadata=[['Subject Property',titleCase(v.field_0008)],['BPO Date',date(v.field_0002)||'Not entered'],['Completed By',[v.field_0018,v.field_0015].filter(Boolean).join(', ')||'Not entered'],['As-Is BPO Market Value',cash(v.field_0477)],['Recommended List Price',cash(v.field_0478)],['Current Listing Price',cash(v['active.0.price'])]];
 for(const [label,value] of metadata){const s=label+': '+value;paragraph(s,{pt:11,gap:0});}y-=15;
 let lastGroup='';for(const section of v._summary.sections){const paragraphs=String(section.body).split(/\n\s*\n/).filter(t=>t.trim()),firstHeight=Math.min(wrap(paragraphs[0]||'').length,8)*leading+9;const totalHeight=paragraphs.reduce((n,p)=>n+wrap(p).length*leading+9,0)+40;if(section.title==='Value Reconciliation and Conclusion'&&totalHeight<=650&&y-bottom<totalHeight)add();if(section.group&&section.group!==lastGroup){heading(section.group,13,firstHeight+wrap(section.title,bold,12).length*leading+20);lastGroup=section.group;}heading(section.title,12,firstHeight);paragraphs.forEach((p,i)=>paragraph(p,{f:section.title==='Value Reconciliation and Conclusion'&&i===paragraphs.length-1&&/concluded.*value/i.test(p)?bold:font}));y-=7;}
 doc.getPages().forEach((p,i)=>{const footer=`BPO Summary | ${i+1} of ${doc.getPageCount()}`;p.drawText(footer,{x:right-font.widthOfTextAtSize(footer,9),y:35,size:9,font,color:rgb(.35,.35,.35)});});doc.setTitle('Broker Price Opinion Summary - '+(v.field_0008||'Subject Property'));doc.setAuthor(v.field_0018||'');return doc.save();
}
module.exports={render};
