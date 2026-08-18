'use strict';
(() => {
  const VERSION=1;
  if((window.__stage13Version||0)>=VERSION)return;
  window.__stage13Version=VERSION;

  function injectStyles(){
    if(document.getElementById('stage13Styles'))return;
    const st=document.createElement('style');
    st.id='stage13Styles';
    st.textContent=`
      .rent-growth-line{display:flex;align-items:stretch;width:100%}
      .rent-growth-line input{flex:1 1 auto;min-width:0;border-radius:6px 0 0 6px!important}
      .rent-growth-percent{display:flex;align-items:center;justify-content:center;min-width:38px;padding:0 10px;border:1px solid var(--line);border-left:0;border-radius:0 6px 6px 0;background:#f2f4f7;color:#344054;font-weight:800;font-size:12px}
      .rent-growth-note{display:block;margin:3px 0 5px;color:#667085;font-size:9px;line-height:1.35;font-weight:500}
    `;
    document.head.appendChild(st);
  }

  function apply(){
    injectStyles();
    const input=document.getElementById('f_rentGrowth');
    const field=input?.closest('.field');
    if(!input||!field)return false;

    const label=field.querySelector('label');
    if(label)label.textContent='Rent Increase Starting in Year 2 (%)';

    let note=field.querySelector('.rent-growth-note');
    if(!note){
      note=document.createElement('span');
      note.className='rent-growth-note';
      note.textContent='Enter the annual percentage change applied to the initial monthly rent beginning in Year 2.';
      label?.insertAdjacentElement('afterend',note);
    }

    // Remove the older overlay wrapper if present, preserving the input.
    const oldWrap=input.closest('.percent-input-wrap');
    if(oldWrap){
      const parent=oldWrap.parentNode;
      parent.insertBefore(input,oldWrap);
      oldWrap.remove();
    }

    if(!input.closest('.rent-growth-line')){
      const line=document.createElement('div');
      line.className='rent-growth-line';
      input.parentNode.insertBefore(line,input);
      line.appendChild(input);
      const pct=document.createElement('span');
      pct.className='rent-growth-percent';
      pct.textContent='%';
      line.appendChild(pct);
    }
    return true;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>100)clearInterval(timer)},125);
    document.addEventListener('click',()=>setTimeout(apply,0));
    const host=document.getElementById('propertyFields');
    if(host)new MutationObserver(apply).observe(host,{childList:true,subtree:true});
  }

  window.Stage13RentPercent={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
