(function(root){
 'use strict';
 function create({enabled=false,projectUrl,getClient,publicKey,getGuestToken,fetchImpl=root.fetch}){
  const allowed=new Set(['https://lmaiqpkogmmsldkziggy.supabase.co','https://oxyjbfhpsxaaerchyaql.supabase.co']);
  return async (address,element)=>{
   if(!enabled||!allowed.has(projectUrl))return {available:false};
   const client=getClient();if(client?.supabaseUrl!==projectUrl)return {available:false};
   const initial=await client.auth.getSession(),owner=initial.data?.session?.user?.id;
   if(initial.error)return {available:false};
   let data,error;
   if(owner){({data,error}=await client.functions.invoke('mobile-street-view',{body:{address}}));}
   else{
    if(!publicKey||!getGuestToken||!element?.isConnected)return {available:false};
    const captchaToken=await getGuestToken(element);
    const before=await client.auth.getSession();
    if(before.error||before.data?.session?.user?.id||!element.isConnected)return {available:false};
    const response=await fetchImpl(projectUrl+'/functions/v1/guest-street-view',{method:'POST',credentials:'omit',headers:{apikey:publicKey,'Content-Type':'application/json'},body:JSON.stringify({address,captchaToken}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)return {available:false};data=await response.json();
   }
   const current=await client.auth.getSession();
   if(error||current.error||current.data?.session?.user?.id!==owner)return {available:false};
   if(data?.available!==true||typeof data.image!=='string'||data.image.length>2100000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(data.image))return {available:false};
   return {available:true,image:data.image,copyright:typeof data.copyright==='string'?data.copyright.slice(0,500):''};
  };
 }
 function bind(host,request){
  const images=[...host.querySelectorAll('[data-streetview]')];
  const load=async img=>{
   if(!img.isConnected||img.dataset.loading==='1')return;img.dataset.loading='1';
   const container=img.closest('.pt-listing-streetview');
   try{
    const data=await request(img.dataset.address,img);
    if(!img.isConnected)return;
    if(!data.available){container?.classList.add('is-unavailable');return;}
    img.addEventListener('error',()=>container?.classList.add('is-unavailable'),{once:true});
    img.src=data.image;
    const credit=container?.querySelector('em');if(credit)credit.textContent='Google Street View'+(data.copyright?' · '+data.copyright:'');
   }catch{if(img.isConnected)container?.classList.add('is-unavailable');}
  };
  if(!root.IntersectionObserver){images.forEach(load);return;}
  const observer=new root.IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){observer.unobserve(entry.target);load(entry.target);}}),{rootMargin:'180px'});
  images.forEach(img=>observer.observe(img));
  // Remove observers when their rendered listing group is replaced.
  const cleanup=new root.MutationObserver(()=>{if(images.every(img=>!img.isConnected)){observer.disconnect();cleanup.disconnect();}});
  cleanup.observe(host.ownerDocument.body,{childList:true,subtree:true});
  if(!images.length){observer.disconnect();cleanup.disconnect();}
 }
 const api={create,bind};if(typeof module!=='undefined')module.exports=api;else root.PTWebsiteStreetView=api;
})(typeof window!=='undefined'?window:globalThis);
