'use strict';
(()=>{
  const RETURN_URL=location.pathname+location.search+location.hash;
  const LOGIN_URL='login.html?return='+encodeURIComponent(RETURN_URL);
  const reveal=()=>document.documentElement.classList.remove('pt-auth-checking');
  const redirect=()=>location.replace(LOGIN_URL);

  async function verifySession(){
    try{
      if(!window.supabase?.createClient)return redirect();
      const client=window.supabase.createClient('https://lmaiqpkogmmsldkziggy.supabase.co','sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7');
      const {data,error}=await client.auth.getSession();
      if(error||!data?.session?.user)return redirect();
      reveal();
    }catch(_error){redirect();}
  }

  verifySession();
})();
