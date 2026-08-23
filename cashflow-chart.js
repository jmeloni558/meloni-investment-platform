'use strict';
(() => {
  if(window.__cashflowChartInitialized)return;
  window.__cashflowChartInitialized=true;

  function shortMoney(v){
    const a=Math.abs(v);
    const sign=v<0?'-':'';
    if(a>=1000000)return sign+'$'+(a/1000000).toFixed(a>=10000000?0:1)+'M';
    if(a>=1000)return sign+'$'+(a/1000).toFixed(a>=100000?0:1)+'k';
    return sign+'$'+Math.round(a);
  }

  function drawCashFlowChart(){
    const canvas=document.getElementById('cfChart');
    const years=window.result?.years||[];
    if(!canvas||!years.length)return false;

    const box=canvas.parentElement;
    const rect=box?.getBoundingClientRect();
    const cssW=Math.max(320,Math.round(rect?.width||canvas.clientWidth||700));
    const cssH=Math.max(220,Math.round(rect?.height||canvas.clientHeight||280));
    const dpr=Math.max(1,window.devicePixelRatio||1);
    canvas.width=Math.round(cssW*dpr);
    canvas.height=Math.round(cssH*dpr);
    canvas.style.width=cssW+'px';
    canvas.style.height=cssH+'px';

    const ctx=canvas.getContext('2d');
    if(!ctx)return false;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cssW,cssH);

    const atcf=years.map(y=>Number(y.atcf)||0);
    const noi=years.map(y=>Number(y.noi)||0);
    let min=Math.min(0,...atcf,...noi),max=Math.max(0,...atcf,...noi);
    if(max===min){max=min+1;}
    const pad=(max-min)*0.10||1;
    max+=pad;min-=pad;

    const left=64,right=18,top=14,bottom=38;
    const plotW=Math.max(1,cssW-left-right),plotH=Math.max(1,cssH-top-bottom);
    const x=i=>left+(years.length===1?plotW/2:(i/(years.length-1))*plotW);
    const y=v=>top+((max-v)/(max-min))*plotH;

    ctx.font='10px Inter, Segoe UI, Arial, sans-serif';
    ctx.textBaseline='middle';
    ctx.lineWidth=1;
    ctx.strokeStyle='#e4e9ef';
    ctx.fillStyle='#667085';
    const ticks=5;
    for(let i=0;i<=ticks;i++){
      const val=max-(max-min)*(i/ticks);
      const yy=top+plotH*(i/ticks);
      ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(cssW-right,yy);ctx.stroke();
      ctx.textAlign='right';ctx.fillText(shortMoney(val),left-8,yy);
    }

    if(min<0&&max>0){
      const zy=y(0);ctx.strokeStyle='#aeb8c4';ctx.beginPath();ctx.moveTo(left,zy);ctx.lineTo(cssW-right,zy);ctx.stroke();
    }

    const maxLabels=Math.max(2,Math.min(10,years.length));
    const step=Math.max(1,Math.ceil(years.length/maxLabels));
    ctx.fillStyle='#667085';ctx.textAlign='center';ctx.textBaseline='top';
    years.forEach((yr,i)=>{if(i%step===0||i===years.length-1)ctx.fillText('Yr '+yr.year,x(i),cssH-bottom+10);});

    function series(values,color){
      ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2.25;ctx.lineJoin='round';ctx.lineCap='round';
      ctx.beginPath();values.forEach((v,i)=>{const xx=x(i),yy=y(v);if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);});ctx.stroke();
      if(years.length<=15){values.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),y(v),3,0,Math.PI*2);ctx.fill();});}
    }

    series(noi,'#6c8a5d');
    series(atcf,'#2d74b8');

    const badge=document.getElementById('chartHoldBadge');
    if(badge)badge.textContent=years.length+'-Year Hold';
    return true;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__cashflowWrapped){
    const wrapped=function(...args){
      const out=originalRender.apply(this,args);
      requestAnimationFrame(drawCashFlowChart);
      return out;
    };
    wrapped.__cashflowWrapped=true;
    window.render=wrapped;
  }

  function start(){
    requestAnimationFrame(drawCashFlowChart);
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>requestAnimationFrame(drawCashFlowChart));
    window.addEventListener('resize',()=>requestAnimationFrame(drawCashFlowChart),{passive:true});
  }

  window.CashFlowChart={draw:drawCashFlowChart};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();