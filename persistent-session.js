'use strict';
(()=>{
 const project='https://lmaiqpkogmmsldkziggy.supabase.co',key='sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7';
 function getClient(){
  if(window.__ptSharedSupabaseClient)return window.__ptSharedSupabaseClient;
  // The embedded desktop workspace shares the parent's client and refresh lock.
  try{if(window.parent!==window&&parent.location.origin===location.origin&&parent.PropertyThesisDesktopPhotos&&parent.__ptSharedSupabaseClient)return window.__ptSharedSupabaseClient=parent.__ptSharedSupabaseClient;}catch(_){}
  if(!window.supabase?.createClient)return null;
  return window.__ptSharedSupabaseClient=window.supabase.createClient(project,key,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'sb-lmaiqpkogmmsldkziggy-auth-token',detectSessionInUrl:true}});
 }
 function resume(){if(document.visibilityState==='hidden')return;const c=window.__ptSharedSupabaseClient;if(c)c.auth.getSession().catch(()=>{});}
 addEventListener('online',resume);addEventListener('pageshow',resume);document.addEventListener('visibilitychange',resume);
 window.PropertyThesisSession={getClient};
})();
