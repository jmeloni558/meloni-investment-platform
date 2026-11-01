export async function sourceContent(db,values,userId,reportId){
 const docs=(values._attachments||[]).filter(d=>d.extract!==false&&d.sourceKind!=='tax'&&d.category!=='tax');
 if(!docs.length||docs.length>12)throw Error('Attach between 1 and 12 source PDFs.');
 if(docs.some(d=>typeof d.path!=='string'||!d.path.startsWith(`${userId}/${reportId}/`)||d.path.includes('..')))throw Error('Invalid document reference.');
 const content=[];let total=0;
 for(const [i,d] of docs.entries()){
  const {data:blob,error}=await db.storage.from('bpo-documents').download(d.path);
  if(error||!blob)throw Error('A source PDF is unavailable.');
  total+=blob.size;if(blob.size>15*1024*1024||total>25*1024*1024)throw Error('Source PDFs exceed the size limit.');
  const bytes=new Uint8Array(await blob.arrayBuffer());if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Invalid source PDF.');
  let binary='';for(let p=0;p<bytes.length;p+=16384)binary+=String.fromCharCode(...bytes.subarray(p,p+16384));
  content.push({type:'input_text',text:JSON.stringify({document:i,name:String(d.name).slice(0,200),group:d.category,sourceKind:d.sourceKind||null})},{type:'input_file',filename:`source-${i}.pdf`,file_data:'data:application/pdf;base64,'+btoa(binary)});
 }
 return content;
}
