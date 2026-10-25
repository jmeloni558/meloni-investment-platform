const {PDFDocument,rgb}=require('pdf-lib');
const fontkit=require('@pdf-lib/fontkit');
const {taggedDocument}=require('./pdf-accessibility.cjs');
function reportModel(paper){
 if(!paper)throw Error('Open a report preview first.');
 const blocks=[];let tableHeading='Report table';
 for(const el of paper.children){
  if(/^H[1-6]$/.test(el.tagName))tableHeading=el.textContent;
  if(el.classList.contains('paper-brand')||el.classList.contains('report-type'))continue;
  if(el.classList.contains('report-logo')){blocks.push({kind:'logo',data:el.querySelector('img')?.getAttribute('src')||''});continue;}
  if(el.classList.contains('report-identity')){blocks.push({kind:'identity',text:el.textContent});continue;}
  if(el.classList.contains('report-card-grid')){blocks.push({kind:'cards',items:[...el.querySelectorAll('.line')].map(card=>[...card.children].map(c=>c.textContent))});continue;}
  if(el.classList.contains('line'))blocks.push({kind:'row',values:[...el.children].map(c=>c.textContent)});
  else if(el.classList.contains('table-wrap'))blocks.push({kind:'table',heading:tableHeading,rows:[...el.querySelectorAll('tr')].map(tr=>[...tr.children].map(c=>c.textContent))});
  else blocks.push({kind:el.tagName==='H2'?'title':el.tagName==='H3'?'heading':'text',text:el.textContent});
 }
 return {title:paper.querySelector('h2')?.textContent||'Property analysis',address:paper.querySelector('h2')?.nextElementSibling?.textContent||'',brandColor:paper.getAttribute('data-brand-color'),clientLayout:paper.getAttribute('data-layout')==='client',releaseReport:paper.getAttribute('data-report-environment')==='production',blocks};
}
function filename(title){return 'PropertyThesis-'+String(title).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,65)+'-report.pdf';}
async function createPdf(model,fontBytes,now=new Date()){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(fontBytes,{subset:true});
 const tags=taggedDocument(doc);
 function drawText(value,options,owner){tags.draw(page,owner,()=>page.semanticText(value,options));}
 doc.setTitle(model.title);doc.setAuthor('PropertyThesis');doc.setCreator('PropertyThesis');doc.setCreationDate(now);
 const ink=rgb(.06,.16,.3),teal=rgb(.04,.43,.37),muted=rgb(.34,.4,.43),rule=rgb(.86,.9,.9);
 let page,y;const pages=[],width=516;
 const clean=text=>String(text??'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
 function wrap(text,size,max){const lines=[];let line='';for(const word of clean(text).split(' ')){const candidate=line?line+' '+word:word;if(font.widthOfTextAtSize(candidate,size)<=max){line=candidate;continue;}if(line)lines.push(line);line='';for(const char of word){if(line&&font.widthOfTextAtSize(line+char,size)>max){lines.push(line);line='';}line+=char;}}if(line)lines.push(line);return lines.length?lines:[''];}
 function newPage(){page=doc.addPage([612,792]);pages.push(page);tags.pageSetup(page);page.semanticText=page.drawText.bind(page);const targetPage=page;for(const method of ['drawText','drawImage','drawRectangle','drawLine']){const draw=page[method].bind(page);page[method]=(...args)=>tags.draw(targetPage,null,()=>draw(...args));}if(!(model.clientLayout&&pages.length===1)){page.drawText('PropertyThesis',{x:48,y:751,size:18,font,color:teal});page.drawText('INVESTMENT ANALYSIS',{x:395,y:753,size:9,font,color:muted});page.drawLine({start:{x:48,y:737},end:{x:564,y:737},color:rule,thickness:1});}y=716;}
 function room(h){if(y-h<58)newPage();}
 function text(value,size=10,color=ink,gap=8,role='P'){const owner=role?tags.element(role):null;const lines=wrap(value,size,width),height=lines.length*size*1.5+gap;if(model.clientLayout&&height<600)room(height);for(const line of lines){room(size*1.5);drawText(line,{x:48,y:y-size,size,font,color},owner);y-=size*1.5;}y-=gap;}
 const columnWidths=n=>n===4?[54,136,148,178]:n===3?[280,118,118]:Array(n).fill(width/n);
 function row(values,header=false,table=false,tableOwner=null,repeat=false){const rowOwner=repeat?null:tags.element(table?'TR':'P',tableOwner||undefined);const widths=table?columnWidths(values.length):[310,206],size=table&&values.length>4?8:header?9:10;const cells=values.map((v,i)=>wrap(v,size,widths[i]-16));const h=Math.max(...cells.map(c=>c.length))*14+10;room(h);if(header)page.drawRectangle({x:48,y:y-h,width,height:h,color:rgb(.9,.95,.94)});let x=48;cells.forEach((lines,i)=>{const owner=repeat?null:table?tags.element(header||i===0?'TH':'TD',rowOwner,header||i===0?{O:'Table',Scope:header?'Column':'Row'}:undefined):rowOwner;lines.forEach((line,j)=>{const right=i>0;drawText(line,{x:right?x+widths[i]-8-font.widthOfTextAtSize(line,size):x+8,y:y-14-j*14,size,font,color:header?teal:ink},owner);});x+=widths[i];});y-=h;page.drawLine({start:{x:48,y},end:{x:564,y},color:rule,thickness:.5});}
 newPage();
 const color=/^#[a-f0-9]{6}$/i.test(model.brandColor||'')?model.brandColor:'#102b4e';
 const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255),coverColor=rgb(...channels),coverText=channels[0]*.299+channels[1]*.587+channels[2]*.114>.65?ink:rgb(1,1,1);
 if(model.clientLayout){
  const identities=model.blocks.filter(b=>b.kind==='identity'&&!b.text.startsWith('Prepared for:'));
  const identityLines=identities.flatMap((b,i)=>wrap(b.text,i===0?11:8.5,226).map(text=>({text,size:i===0?11:8.5})));
  const logoBlock=model.blocks.find(b=>b.kind==='logo'),logo=logoBlock&&/^data:image\/png;base64,/.test(logoBlock.data)?await doc.embedPng(logoBlock.data):null;
  const headerHeight=Math.max(110,50+identityLines.reduce((sum,l)=>sum+l.size*1.5,0)+(logo?50:0));
  page.drawRectangle({x:0,y:792-headerHeight,width:612,height:headerHeight,color:rgb(.06,.16,.27)});
  page.drawRectangle({x:318,y:792-headerHeight,width:294,height:headerHeight,color:rgb(.08,.24,.32)});
  page.drawText('PropertyThesis',{x:36,y:750,size:25,font,color:rgb(1,1,1)});
  page.drawText('Know the Numbers. Make the Offer.',{x:36,y:729,size:9,font,color:rgb(.70,.88,.85)});
  page.drawText('PROPERTY INVESTMENT REPORT',{x:36,y:708,size:7.5,font,color:rgb(.70,.78,.83)});
  let by=766;
  page.drawText('PREPARED BY',{x:342,y:by,size:7,font,color:rgb(.65,.83,.83)});by-=18;
  const identityOwner=tags.element('P');
  for(const line of identityLines){drawText(line.text,{x:342,y:by,size:line.size,font,color:rgb(1,1,1)},identityOwner);by-=line.size*1.5;}
  y=792-headerHeight-22;text(model.title,21,ink,7,'H1');if(model.address)text(model.address,9,muted,12);
  if(logo){const scale=Math.min(90/logo.width,40/logo.height);page.drawImage(logo,{x:342,y:792-headerHeight+12,width:logo.width*scale,height:logo.height*scale});}
  const status=model.blocks.find(b=>b.kind==='text'&&b.text?.startsWith(model.releaseReport?'PROPERTY ANALYSIS · ':'DEVELOPMENT SAMPLE · '));if(status)text(status.text,8,muted,8);
 }else{
 page.drawRectangle({x:0,y:570,width:612,height:222,color:coverColor});
 page.drawRectangle({x:48,y:594,width:66,height:4,color:rgb(.96,.77,.33)});
 page.drawText('PropertyThesis',{x:48,y:719,size:32,font,color:coverText});
 page.drawText('Know the Numbers. Make the Offer.',{x:48,y:684,size:12,font,color:coverText});
 page.drawText('INVESTMENT PROPERTY ANALYSIS',{x:48,y:630,size:14,font,color:coverText});
 y=530;text(model.title,24,ink,12,'H1');text(model.address,12,muted,20);
 const status=model.blocks.find(b=>b.kind==='text'&&b.text?.startsWith(model.releaseReport?'PROPERTY ANALYSIS · ':'DEVELOPMENT SAMPLE · '));
 if(status)text(status.text,9,teal,16);
 text('Property & financing  /  Cash flow  /  Valuation',11,ink,12);
 text('Prepared from the assumptions shown in this report. Projections are estimates and are not guaranteed returns.',10,muted);
 for(const block of model.blocks.filter(b=>b.kind==='logo'||b.kind==='identity')){
  if(block.kind==='identity')text(block.text,10,ink,4);
  else if(/^data:image\/png;base64,/.test(block.data)){const logo=await doc.embedPng(block.data),scale=Math.min(150/logo.width,70/logo.height);room(90);page.drawImage(logo,{x:48,y:y-logo.height*scale,width:logo.width*scale,height:logo.height*scale});y-=logo.height*scale+12;}
 }
 newPage();
 }
 let bodyStarted=!model.clientLayout;
 for(const [blockIndex,block] of model.blocks.entries()){
  if(block.kind==='heading')bodyStarted=true;
  if(!bodyStarted)continue;
  if(block.kind==='title'){room(85);text(block.text,22,ink,8,'H2');}
  else if(block.kind==='heading'){const upcoming=model.blocks[blockIndex+1];if(upcoming?.kind==='columns'){const height=Math.max(...upcoming.columns.map(c=>c.reduce((n,e)=>n+wrap(e.title||e.label+': '+e.value,e.title?10:9.5,226).length*14+(e.title?16:9),0)))+20;room(Math.min(height,600)+48);}const next=model.blocks.slice(blockIndex+1,blockIndex+3).filter(b=>b.kind==='text');const following=model.clientLayout?Math.min(350,next.reduce((sum,b)=>sum+wrap(b.text,9,width).length*13.5+8,0)):0;room(Math.max(model.blocks[blockIndex+1]?.kind==='heading'?140:75,following+48));y-=12;text(block.text,13,teal,6,'H2');}
  else if(block.kind==='row')row(block.values);
  else if(block.kind==='columns'){
   const cw=246,gutter=24,size=9.5,lineHeight=14;
   const columns=block.columns.map(entries=>entries.map(e=>{
    const lines=wrap(e.title||e.label+': '+e.value,e.title?10:size,cw-20);
    return {...e,lines,height:lines.length*lineHeight+(e.title?16:9)};
   }));
   const total=Math.max(...columns.map(c=>c.reduce((n,e)=>n+e.height,0)))+20;
   room(Math.min(total,600));
   while(columns.some(c=>c.length)){
    const available=y-58,segments=columns.map(c=>{
     const part=[];let h=20;
     while(c.length&&h+c[0].height<=available){
      if(c[0].title&&c.length>1&&h+c[0].height+c[1].height>available)break;
      const e=c.shift();part.push(e);h+=e.height;
     }
     return {part,h};
    });
    if(!segments.some(s=>s.part.length)){newPage();continue;}
    const height=Math.max(...segments.map(s=>s.part.length?s.h:0));
    segments.forEach((segment,i)=>{
     if(!segment.part.length)return;
     const x=48+i*(cw+gutter);
     page.drawRectangle({x,y:y-height,width:cw,height,color:rgb(.96,.98,.98),borderColor:rule,borderWidth:.6});
     let cy=y-17;
     for(const e of segment.part){const owner=tags.element(e.title?'H3':'P');if(e.title&&cy<y-17){page.drawLine({start:{x:x+10,y:cy+6},end:{x:x+cw-10,y:cy+6},color:rule,thickness:.6});}for(const line of e.lines){drawText(line,{x:x+10,y:cy,size:e.title?10:size,font,color:e.title?teal:ink},owner);cy-=lineHeight;}cy-=e.title?16:9;}
    });
    y-=height+12;if(columns.some(c=>c.length))newPage();
   }
  }
  else if(block.kind==='cards'){
   for(let i=0;i<block.items.length;i+=2){
    const pair=block.items.slice(i,i+2),cw=252;
    const formatted=pair.map(([label,value])=>({label:wrap(label,8,cw-20),value:wrap(value,12,cw-20)}));
    const h=Math.max(...formatted.map(c=>c.label.length*12+c.value.length*17+22));room(h+10);
    formatted.forEach((c,j)=>{const owner=tags.element('P');const x=48+j*264;page.drawRectangle({x,y:y-h,width:cw,height:h,color:rgb(.97,.98,.99),borderColor:rule,borderWidth:.6});let cy=y-16;for(const line of c.label){drawText(line,{x:x+10,y:cy,size:8,font,color:muted},owner);cy-=12;}cy-=4;for(const line of c.value){drawText(line,{x:x+10,y:cy,size:12,font,color:ink},owner);cy-=17;}});y-=h+10;
   }
  }
  else if(block.kind==='table'){const [head,...rows]=block.rows;if(!head)continue;const tableOwner=tags.element('Table');const widths=columnWidths(head.length),size=head.length>4?8:9,headHeight=Math.max(...head.map((v,i)=>wrap(v,size,widths[i]-16).length))*14+10,firstHeight=rows[0]?Math.max(...rows[0].map((v,i)=>wrap(v,head.length>4?8:10,widths[i]-16).length))*14+10:0;room(headHeight+firstHeight);row(head,true,true,tableOwner);for(const values of rows){const widths=columnWidths(values.length),h=Math.max(...values.map((v,i)=>wrap(v,values.length>4?8:10,widths[i]-16).length))*14+10;if(y-h<58){newPage();text((block.heading||'Report table')+' (continued)',13,teal,8,null);row(head,true,true,tableOwner,true);}row(values,false,true,tableOwner);}y-=8;}
  else if(block.kind==='logo'||block.kind==='identity')continue;
  else if(block.kind==='disclaimer')text(block.text,8,muted,6);
  else text(block.text,10.5,ink,10);
 }
 pages.forEach((p,i)=>{p.drawText((model.releaseReport?'PropertyThesis report':'Development sample')+' | Generated '+now.toISOString().slice(0,10)+' UTC',{x:48,y:32,size:8,font,color:muted});p.drawText((i+1)+' / '+pages.length,{x:535,y:32,size:8,font,color:muted});});
 tags.finish();
 return doc.saveAsBase64();
}
module.exports={reportModel,filename,createPdf};
