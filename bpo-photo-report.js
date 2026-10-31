'use strict';
(()=>{
  const bucketName='property-photos',fields='id,address,completed_at';
  const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toLowerCase();
  const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
  let pdfPromise;
  async function owner(db){const {data,error}=await db.auth.getSession();if(error||!data.session?.user)throw Error('Sign in to access your property photos.');return data.session.user.id;}
  async function guard(db,id){if(await owner(db)!==id)throw Error('Your account changed. Reopen the property and try again.');}
  async function albums(db){const rows=[];for(let offset=0;;offset+=500){const {data,error}=await db.from('photo_properties').select(fields).order('address').order('id').range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)return rows;}}
  async function choose(db,address,current={}){
    const userId=await owner(db),library=await import('./photo-library.mjs');
    const modal=document.createElement('dialog');modal.className='pt-photo-picker';modal.setAttribute('aria-label','Choose optional report photos');
    modal.innerHTML='<header><h2>Photos for the final BPO package</h2><button type="button" data-cancel>Cancel</button></header><p>Select the photos to append after the supporting documents. Photos are optional. JPG, PNG and WebP can be included; convert HEIC/HEIF to JPG first.</p><label>Property photo address<select data-album></select></label><div><a data-upload target="_blank" rel="noopener">Upload / manage photos</a> <button data-refresh type="button">Refresh photos</button></div><p role="status" aria-live="polite"></p><div class="pt-photo-picker-grid"></div><footer><span data-count>0 selected</span><button type="button" data-use>Use selected photos</button></footer>';
    const select=modal.querySelector('select'),grid=modal.querySelector('.pt-photo-picker-grid'),message=modal.querySelector('[role=status]'),use=modal.querySelector('[data-use]');
    modal.querySelector('[data-upload]').href='photos.html?address='+encodeURIComponent(address);
    let rows=[],chosen=new Set(),albumId='',generation=0,closed=false;const observers=[];
    const disconnect=()=>observers.splice(0).forEach(o=>o.disconnect());
    const count=()=>modal.querySelector('[data-count]').textContent=chosen.size+' selected';
    let finish,subscription;
    const result=new Promise(resolve=>{finish=value=>{if(closed)return;closed=true;generation++;disconnect();subscription?.unsubscribe?.();modal.close();modal.remove();resolve(value);};});
    subscription=db.auth.onAuthStateChange?.((_event,session)=>{if(session?.user?.id!==userId)setTimeout(()=>finish(null),0);})?.data?.subscription;
    async function loadPhotos(){
      const token=++generation;disconnect();chosen=new Set();count();grid.replaceChildren();use.disabled=true;message.textContent='Loading photos…';albumId=select.value;
      if(!albumId){message.textContent='Choose a photo address, or upload photos first. You can also cancel and export without photos.';return;}
      try{const files=await library.listPhotos(db.storage.from(bucketName),userId+'/'+albumId);await guard(db,userId);if(closed||token!==generation)return;
        for(const file of files){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.disabled=!/\.(jpe?g|png|webp)$/i.test(file.name);box.checked=!box.disabled&&current.propertyId===albumId&&(current.names||[]).includes(file.name);if(box.checked)chosen.add(file.name);box.setAttribute('aria-label','Include '+library.originalName(file.name));box.onchange=()=>{if(box.checked)chosen.add(file.name);else chosen.delete(file.name);count();};label.append(box,text('span',library.originalName(file.name)));
          if(box.disabled)label.append(text('p','Convert to JPG to include in a report.'));
          else{const img=document.createElement('img');img.alt=library.originalName(file.name);img.loading='lazy';label.prepend(img);const path=userId+'/'+albumId+'/'+file.name;const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();db.storage.from(bucketName).createSignedUrl(path,300).then(({data,error})=>{if(closed||token!==generation)return;if(!error)img.src=data.signedUrl;}).catch(()=>{});});observers.push(observer);observer.observe(img);}
          grid.append(label);
        }count();use.disabled=false;message.textContent=files.length?'Select the photos you want in this report.':'No photos yet. Upload photos, then Refresh photos—or cancel to leave photos out.';
      }catch(error){if(!closed&&token===generation)message.textContent='Could not load photos: '+error.message;}
    }
    async function loadAlbums(){use.disabled=true;message.textContent='Loading your photo addresses…';try{rows=await albums(db);await guard(db,userId);if(closed)return;const previous=select.value||current.propertyId||rows.find(r=>norm(r.address)===norm(address))?.id||'';select.replaceChildren(new Option('Choose a photo address',''),...rows.map(row=>new Option(row.address+(row.completed_at?' (completed)':''),row.id)));select.value=previous;await loadPhotos();}catch(error){if(!closed)message.textContent='Could not load photo addresses: '+error.message;}}
    modal.querySelector('[data-cancel]').onclick=()=>finish(null);modal.addEventListener('cancel',e=>{e.preventDefault();finish(null);});select.onchange=loadPhotos;modal.querySelector('[data-refresh]').onclick=loadAlbums;
    use.onclick=()=>finish({propertyId:albumId,address:rows.find(row=>row.id===albumId)?.address||'',reportAddress:address,names:[...chosen],include:chosen.size>0});
    document.body.append(modal);modal.showModal();loadAlbums();return result;
  }
  async function pdfLib(){if(window.PDFLib)return window.PDFLib;return pdfPromise||(pdfPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/vendor/pdf-lib-1.17.1.min.js';script.onload=()=>resolve(window.PDFLib);script.onerror=()=>{pdfPromise=null;reject(Error('Photo PDF renderer could not load.'));};document.head.append(script);}));}
  async function build(db,selection,address){
    if(!selection?.include)return null;
    if(selection.reportAddress&&norm(selection.reportAddress)!==norm(address))throw Error('The BPO address changed. Choose photos again or leave them out.');
    if(!selection.propertyId||!selection.names?.length)throw Error('Choose photos for the final package, or uncheck Include photos.');
    const userId=await owner(db),library=await import('./photo-library.mjs'),bucket=db.storage.from(bucketName);
    const {data:album,error}=await db.from('photo_properties').select(fields).eq('id',selection.propertyId).single();if(error||!album)throw Error('The selected photo address is unavailable. Choose photos again or leave them out.');
    const files=await library.listPhotos(bucket,userId+'/'+album.id),names=[...new Set(selection.names)];
    if(names.some(name=>!files.some(file=>file.name===name)))throw Error('A selected photo was deleted or is unavailable. Choose photos again or leave them out.');
    const {PDFDocument,StandardFonts,rgb}=await pdfLib(),doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
    const clean=value=>String(value).replace(/[^\x20-\x7e]/g,'?');
    const fit=(value,size,width)=>{let s=clean(value);while(s&&font.widthOfTextAtSize(s,size)>width)s=s.slice(0,-1);return s;};
    let page;
    for(let i=0;i<names.length;i++){
      await guard(db,userId);const name=names[i];const {data:blob,error:downloadError}=await bucket.download(userId+'/'+album.id+'/'+name);if(downloadError)throw Error('Could not read '+library.originalName(name)+'. Retry or leave photos out.');
      let bitmap;try{bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});}catch(_){throw Error('Cannot render '+library.originalName(name)+'. Use JPG, PNG or WebP, or deselect this photo.');}
      const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const image=await doc.embedJpg(canvas.toDataURL('image/jpeg',.9));canvas.width=canvas.height=1;
      if(i%2===0){page=doc.addPage([612,792]);page.drawText('Property Photos',{x:42,y:750,size:18,font:bold,color:rgb(.07,.24,.26)});page.drawText(fit(address,10,528),{x:42,y:730,size:10,font});page.drawText('Property photos | '+(Math.floor(i/2)+1)+' / '+Math.ceil(names.length/2),{x:42,y:24,size:9,font});}
      const y=i%2===0?413:87,ratio=Math.min(528/image.width,280/image.height);page.drawImage(image,{x:42+(528-image.width*ratio)/2,y:y+(280-image.height*ratio)/2,width:image.width*ratio,height:image.height*ratio});page.drawText(fit((i+1)+'. '+library.originalName(name),9,528),{x:42,y:y-18,size:9,font});
    }
    await guard(db,userId);return doc.save();
  }
  window.PropertyThesisBPOPhotos={choose,build};
})();
