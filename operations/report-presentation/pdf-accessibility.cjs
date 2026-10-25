const {PDFName,PDFHexString,PDFOperator}=require('pdf-lib');

// Keep logical reading order independent of visual page breaks and coordinates.
function taggedDocument(doc){
 const ctx=doc.context,root=ctx.obj({Type:'StructTreeRoot',K:[]}),rootRef=ctx.register(root);
 const document=element('Document',{dict:root,ref:rootRef});
 const parents=[];
 doc.catalog.set(PDFName.of('StructTreeRoot'),rootRef);
 doc.catalog.set(PDFName.of('MarkInfo'),ctx.obj({Marked:true}));
 doc.catalog.set(PDFName.of('Lang'),PDFHexString.fromText('en-US'));
 doc.catalog.set(PDFName.of('ViewerPreferences'),ctx.obj({DisplayDocTitle:true}));
 function element(role,parent=document,attributes){
  const dict=ctx.obj({Type:'StructElem',S:role,P:parent.ref,K:[]});
  if(attributes)dict.set(PDFName.of('A'),ctx.obj(attributes));
  const ref=ctx.register(dict);parent.dict.lookup(PDFName.of('K')).push(ref);
  return {dict,ref,role};
 }
 function pageSetup(page){
  const index=parents.length,refs=[];parents.push(refs);
  page.node.set(PDFName.of('StructParents'),ctx.obj(index));
  page.node.set(PDFName.of('Tabs'),PDFName.of('S'));
  return refs;
 }
 function draw(page,owner,operation){
  if(owner){
   const index=page.node.lookup(PDFName.of('StructParents')).asNumber(),refs=parents[index],mcid=refs.length;
   refs.push(owner.ref);
   owner.dict.lookup(PDFName.of('K')).push(ctx.obj({Type:'MCR',Pg:page.ref,MCID:mcid}));
   page.pushOperators(PDFOperator.of('BDC',[PDFName.of(owner.role),ctx.obj({MCID:mcid})]));
  }else page.pushOperators(PDFOperator.of('BMC',[PDFName.of('Artifact')]));
  try{operation();}finally{page.pushOperators(PDFOperator.of('EMC'));}
 }
 function finish(){
  const nums=[];parents.forEach((refs,index)=>nums.push(index,refs));
  root.set(PDFName.of('ParentTree'),ctx.register(ctx.obj({Nums:nums})));
  root.set(PDFName.of('ParentTreeNextKey'),ctx.obj(parents.length));
 }
 return {element,pageSetup,draw,finish};
}
module.exports={taggedDocument};
