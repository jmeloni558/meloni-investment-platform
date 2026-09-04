(()=>{
  if(window.__ptAssistantLoaded)return;window.__ptAssistantLoaded=true;
  const ENDPOINT='https://lmaiqpkogmmsldkziggy.supabase.co/functions/v1/propertythesis-assistant';
  const API_KEY='sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7';
  const history=[];
  const GREETING='Hi! I can explain PropertyThesis, help you find the right analysis step, and clarify real estate analysis terms. What can I help with?';
  const launcher=document.createElement('button');launcher.type='button';launcher.className='pt-ai-launcher';launcher.textContent='Ask PropertyThesis';launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','ptAiPanel');
  const panel=document.createElement('section');panel.id='ptAiPanel';panel.className='pt-ai-panel';panel.hidden=true;panel.setAttribute('aria-label','PropertyThesis AI guide');
  panel.innerHTML=`<header class="pt-ai-head"><div><strong>PropertyThesis Guide</strong><small>AI-powered site assistance</small></div><button class="pt-ai-close" type="button" aria-label="Close assistant">&times;</button></header><div class="pt-ai-messages" role="log" aria-live="polite"></div><div class="pt-ai-suggestions" aria-label="Suggested questions"><button type="button">How do I start?</button><button type="button">What is cap rate?</button><button type="button">Where do I enter expenses?</button></div><form class="pt-ai-form"><textarea class="pt-ai-input" rows="1" maxlength="800" placeholder="Ask about the site or your analysis…" aria-label="Message PropertyThesis Guide"></textarea><button class="pt-ai-send" type="submit">Send</button></form><div class="pt-ai-note">AI guidance may contain errors and is educational only—not legal, tax, accounting, appraisal, lending, or investment advice. <a href="mailto:jamie@propertythesis.com">Contact us</a>.</div>`;
  document.body.append(launcher,panel);
  const messages=panel.querySelector('.pt-ai-messages'),input=panel.querySelector('.pt-ai-input'),send=panel.querySelector('.pt-ai-send');
  const approvedLinks=new Map([['/index.html?home=1','Start a free analysis'],['/pricing.html','Pricing'],['/guides.html','Guides'],['/glossary.html','Glossary'],['/mortgage-tools.html','Mortgage tools'],['/index.html?signin=1','Sign in']]);
  const render=(el,text)=>{const pattern=/\[([^\]]{1,80})\]\((\/(?:index\.html\?(?:home|signin)=1|pricing\.html|guides\.html|glossary\.html|mortgage-tools\.html))\)|(\/(?:index\.html\?(?:home|signin)=1|pricing\.html|guides\.html|glossary\.html|mortgage-tools\.html))/g;let start=0,match;while((match=pattern.exec(text))){el.append(document.createTextNode(text.slice(start,match.index)));const href=match[2]||match[3],link=document.createElement('a');link.href=href;link.textContent=match[1]||approvedLinks.get(href)||'Open page';link.style.cssText='color:#075f8f;font-weight:700;text-decoration:underline;text-underline-offset:2px';el.append(link);start=pattern.lastIndex}el.append(document.createTextNode(text.slice(start)))};
  const add=(text,role)=>{const el=document.createElement('div');el.className=`pt-ai-message ${role}`;render(el,String(text||''));messages.appendChild(el);messages.scrollTop=messages.scrollHeight;return el};
  const resetConversation=()=>{history.length=0;messages.textContent='';input.value='';add(GREETING,'assistant')};
  resetConversation();
  const toggle=(open=!panel.hidden)=>{panel.hidden=!open;launcher.setAttribute('aria-expanded',String(open));if(open)setTimeout(()=>input.focus(),30)};
  launcher.addEventListener('click',()=>toggle(panel.hidden));panel.querySelector('.pt-ai-close').addEventListener('click',()=>toggle(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)toggle(false)});
  const pageContext=()=>{const active=document.querySelector('.workflow-step.active,.step.active,[aria-current="step"],.section.active h1,.section.active h2');return {url:location.href,title:document.title,heading:(document.querySelector('main h1,h1')?.textContent||'').trim().slice(0,160),activeStep:(active?.textContent||'').trim().replace(/\s+/g,' ').slice(0,160)}};
  const accessToken=async()=>{try{return (await window.__ptSharedSupabaseClient?.auth?.getSession())?.data?.session?.access_token||''}catch{return ''}};
  const watchAuth=()=>{const client=window.__ptSharedSupabaseClient;if(!client?.auth?.onAuthStateChange)return false;let identity;client.auth.getSession().then(({data})=>{identity=data?.session?.user?.id||null}).catch(()=>{identity=null});client.auth.onAuthStateChange((event,session)=>{const next=session?.user?.id||null;if(event==='SIGNED_OUT'||(event==='SIGNED_IN'&&identity!==undefined&&next!==identity))resetConversation();identity=next});return true};
  let authWatchTries=0;const authWatchTimer=setInterval(()=>{if(watchAuth()||++authWatchTries>40)clearInterval(authWatchTimer)},150);
  const ask=async text=>{
    text=String(text||'').trim();if(!text||send.disabled)return;
    add(text,'user');history.push({role:'user',content:text});input.value='';send.disabled=true;const status=add('Thinking…','status');
    try{
      const token=await accessToken();const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':API_KEY,'Authorization':`Bearer ${token||API_KEY}`},body:JSON.stringify({message:text,history:history.slice(0,-1).slice(-8),page:pageContext()})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'The assistant is temporarily unavailable.');
      const answer=String(data.answer||'I could not prepare an answer. Please try another question.');history.push({role:'assistant',content:answer});status.remove();add(answer,'assistant');
    }catch(error){status.remove();const message=error.message||'The assistant is temporarily unavailable.';add(message.includes('jamie@propertythesis.com')?message:`${message}\n\nUse the Contact us link below for help.`,'assistant')}
    finally{send.disabled=false;input.focus()}
  };
  panel.querySelector('.pt-ai-form').addEventListener('submit',e=>{e.preventDefault();ask(input.value)});input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(input.value)}});panel.querySelectorAll('.pt-ai-suggestions button').forEach(button=>button.addEventListener('click',()=>ask(button.textContent)));
})();
