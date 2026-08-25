'use strict';
(() => {
  if (window.__propertyThesisProFormaDownloadControllerV1) return;
  window.__propertyThesisProFormaDownloadControllerV1 = true;

  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const safeName = v => String(v || 'PropertyThesis Pro Forma').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 90);

  function stateObj(){ return window.state || {}; }
  function resultObj(){ return window.result || {}; }
  function years(){
    const hold = Math.max(1, Math.round(num(stateObj().hold) || 1));
    return (resultObj().years || []).filter(y => num(y.year) >= 1 && num(y.year) <= hold).slice(0, hold);
  }

  function branding(){
    let p = {};
    try { p = window.UserBranding?.getProfile?.() || {}; } catch (_e) {}
    const company = String(p.company_name || 'PropertyThesis').trim();
    const person = [p.full_name, p.professional_title].filter(Boolean).join(' • ').trim() || company;
    const contact = [p.email, p.phone, p.website].filter(Boolean).join(' • ').trim();
    const address = String(stateObj().address || stateObj().name || document.querySelector('#clientReport .address')?.textContent || 'Income-Producing Property').trim();
    return {company, person, contact, address};
  }

  function pointsAmort(y){
    const s=stateObj(),r=resultObj();
    return s.loanYears && y.year <= s.loanYears ? num(r.pointCost) / num(s.loanYears) : 0;
  }
  function originationAmort(y){
    const s=stateObj();
    return s.loanYears && y.year <= s.loanYears ? num(s.origFee) / num(s.loanYears) : 0;
  }
  function saleForYear(n){
    const s=stateObj(),r=resultObj();
    const price=num(s.price),grossSale=price*Math.pow(1+num(s.appreciation),n),selling=grossSale*num(s.sellCost),netSale=grossSale-selling;
    const annualDep=num(r.depreciation),depLife=Math.max(0,num(s.depLife)||27.5),accDep=Math.min(annualDep*n,annualDep*depLife),book=price-accDep,gain=netSale-book;
    const gainRate=n===1?num(s.ordinaryTax):num(s.capGainsTax),taxesGain=gain*gainRate,depTax=accDep*num(s.depTax),saleTax=taxesGain+depTax;
    return {netSale,book,gain,gainRate,taxesGain,accDep,depTax,saleTax};
  }

  function loadXlsx(){
    if(window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-pt-xlsx]');
      if(existing){existing.addEventListener('load',()=>resolve(window.XLSX),{once:true});existing.addEventListener('error',reject,{once:true});return;}
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.async=true;s.dataset.ptXlsx='1';
      s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Excel library failed to initialize'));
      s.onerror=()=>reject(new Error('Excel library failed to load'));
      document.head.appendChild(s);
    });
  }

  function brandedRows(title){
    const b=branding();
    const rows=[[b.company],[title],[b.address],['Prepared by: '+b.person]];
    if(b.contact) rows.push(['Contact: '+b.contact]);
    rows.push(['PropertyThesis • Know the Numbers. Build the Case.'],[]);
    return rows;
  }
  function makeSheet(XLSX,title,header,bodyRows){
    const aoa=[...brandedRows(title),header,...bodyRows];
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols']=[{wch:34},...header.slice(1).map(()=>({wch:15}))];
    ws['!freeze']={xSplit:1,ySplit:brandedRows(title).length+1};
    return ws;
  }

  function buildWorkbook(XLSX){
    const ys=years();
    if(!ys.length) throw new Error('Run the analysis before exporting the pro forma workbook.');
    const yearHeaders=['',...ys.map(y=>'Year '+y.year)];
    const wb=XLSX.utils.book_new();

    const cfRows=[
      ['Potential Gross Income',...ys.map(y=>num(y.pgi))],
      ['− Vacancy and Credit Losses',...ys.map(y=>num(y.vac))],
      ['= Effective Gross Income',...ys.map(y=>num(y.egi))],
      ['− Operating Expenses',...ys.map(y=>num(y.opex))],
      ['= Net Operating Income',...ys.map(y=>num(y.noi))],
      ['− Debt Service',...ys.map(y=>num(y.debt))],
      ['= Before-Tax Cash Flow',...ys.map(y=>num(y.noi)-num(y.debt))],
      ['− Taxes from Operations',...ys.map(y=>num(y.opTax))],
      ['= After-Tax Cash Flow',...ys.map(y=>num(y.atcf))]
    ];
    XLSX.utils.book_append_sheet(wb,makeSheet(XLSX,'Projected After-Tax Cash Flow',['After-Tax Cash Flow (ATCF)',...yearHeaders.slice(1)],cfRows),'After Tax Cash Flow');

    const taxRows=[
      ['Net Operating Income',...ys.map(y=>num(y.noi))],
      ['− Interest',...ys.map(y=>num(y.interest))],
      ['− Depreciation',...ys.map(()=>num(resultObj().depreciation))],
      ['− Amortization of Points',...ys.map(y=>pointsAmort(y))],
      ['− Amortization of Origination Fee',...ys.map(y=>originationAmort(y))],
      ['= Taxable Income',...ys.map(y=>num(y.taxable))],
      ['× Ordinary Income Tax Rate',...ys.map(()=>num(stateObj().ordinaryTax))],
      ['= Taxes from Operations',...ys.map(y=>num(y.opTax))]
    ];
    XLSX.utils.book_append_sheet(wb,makeSheet(XLSX,'Taxes From Operations',['Taxes From Operations',...yearHeaders.slice(1)],taxRows),'Taxes From Operations');

    const sale=ys.map(y=>saleForYear(num(y.year)||1));
    const saleRows=[
      ['Net Sales Price',...sale.map(d=>d.netSale)],
      ['− Book Value',...sale.map(d=>d.book)],
      ['= Gain (Loss) on Sale',...sale.map(d=>d.gain)],
      ['× Applicable Gain Tax Rate',...sale.map(d=>d.gainRate)],
      ['= Taxes Due on Gain/Loss',...sale.map(d=>d.taxesGain)],
      ['Accumulated Depreciation',...sale.map(d=>d.accDep)],
      ['× Depreciation Tax Rate',...sale.map(()=>num(stateObj().depTax))],
      ['= Taxes Due on Depreciation',...sale.map(d=>d.depTax)],
      ['Taxes Due on Sale',...sale.map(d=>d.saleTax)]
    ];
    XLSX.utils.book_append_sheet(wb,makeSheet(XLSX,'Taxes Due on Sale',['Taxes Due on Sale',...yearHeaders.slice(1)],saleRows),'Taxes Due on Sale');

    const currencyRows={
      'After Tax Cash Flow':[8,9,10,11,12,13,14,15,16],
      'Taxes From Operations':[8,9,10,11,12,13,15],
      'Taxes Due on Sale':[8,9,10,12,13,15,16]
    };
    Object.entries(currencyRows).forEach(([name,rows])=>{
      const ws=wb.Sheets[name];
      const range=XLSX.utils.decode_range(ws['!ref']);
      rows.forEach(r=>{for(let c=1;c<=range.e.c;c++){const cell=ws[XLSX.utils.encode_cell({r:r-1,c})];if(cell)cell.z='$#,##0;[Red]-$#,##0';}});
    });
    ['Taxes From Operations','Taxes Due on Sale'].forEach(name=>{
      const ws=wb.Sheets[name],range=XLSX.utils.decode_range(ws['!ref']);
      for(let r=0;r<=range.e.r;r++){
        const a=ws[XLSX.utils.encode_cell({r,c:0})]?.v||'';
        if(/Tax Rate/.test(String(a))){for(let c=1;c<=range.e.c;c++){const cell=ws[XLSX.utils.encode_cell({r,c})];if(cell)cell.z='0.00%';}}
      }
    });
    return wb;
  }

  async function download(){
    try{
      const XLSX=await loadXlsx();
      const wb=buildWorkbook(XLSX);
      const filename=safeName((stateObj().address||stateObj().name||'PropertyThesis')+' Pro Forma')+'.xlsx';
      XLSX.writeFile(wb,filename,{compression:true});
    }catch(err){
      console.error('PropertyThesis pro forma export failed',err);
      alert(err?.message||'Unable to export the pro forma workbook.');
    }
  }

  function enforceButton(){
    const btn=document.getElementById('rbDownloadProForma');
    if(!btn)return false;
    btn.textContent='Download Pro Forma';
    btn.disabled=false;
    btn.removeAttribute('aria-hidden');
    btn.style.display='';
    return true;
  }
  const observer=new MutationObserver(()=>enforceButton());
  function start(){
    try{observer.observe(document.body,{childList:true,subtree:true,characterData:true});}catch(_e){}
    enforceButton();
    setInterval(enforceButton,500);
  }

  window.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#rbDownloadProForma');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    download();
  },true);

  window.PropertyThesisProFormaDownload={download,buildWorkbook,years,enforceButton};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
