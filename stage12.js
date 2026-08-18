'use strict';
(() => {
  const VERSION=1;
  if((window.__stage12Version||0)>=VERSION)return;
  window.__stage12Version=VERSION;

  function injectStyles(){
    if(document.getElementById('stage12Styles'))return;
    const st=document.createElement('style');
    st.id='stage12Styles';
    st.textContent=`
      .guidance-box{margin-top:7px;padding:9px 10px;border:1px solid #d9e4ee;border-radius:8px;background:#f8fbfd;color:#475467;font-size:10px;line-height:1.45}
      .guidance-box b{color:#174f83}.guidance-box p{margin:3px 0 0}.guidance-box a{color:#175c92;font-weight:700;text-decoration:none}.guidance-box a:hover{text-decoration:underline}
    `;
    document.head.appendChild(st);
  }

  function apply(){
    injectStyles();
    const input=document.getElementById('f_rentGrowth');
    const field=input?.closest('.field');
    if(!field||field.querySelector('.guidance-box[data-guide="rentGrowth"]'))return !!field;
    const box=document.createElement('div');
    box.className='guidance-box';
    box.dataset.guide='rentGrowth';
    box.innerHTML=`<b>How to choose this assumption</b><p>This is your estimate of how monthly rent may change beginning in Year 2. Base it on current rental-market conditions and your expectations for the local area. The assumption can be <strong>positive</strong> when rents are expected to rise, <strong>0%</strong> when rents are expected to remain generally stable, or <strong>negative</strong> when rents are expected to decline. Use a conservative figure when the outlook is uncertain.</p><p><a href="https://www.zillow.com/research/data/" target="_blank" rel="noopener">Research local rent trends with Zillow Research (ZORI) ↗</a></p>`;
    field.appendChild(box);
    return true;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>80)clearInterval(timer)},125);
    document.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.Stage12Guidance={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
