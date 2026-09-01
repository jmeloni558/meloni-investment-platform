'use strict';
(() => {
  const VERSION = 6;
  if ((window.__propertyThesisProFormaDownloadControllerVersion || 0) >= VERSION) return;
  window.__propertyThesisProFormaDownloadControllerVersion = VERSION;

  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const safeName = v => String(v || 'PropertyThesis Pro Forma').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 90);

  function stateObj(){
    try { if (typeof state !== 'undefined' && state) return state; } catch (_e) {}
    return window.state || {};
  }

  function resultObj(){
    try { if (typeof result !== 'undefined' && result) return result; } catch (_e) {}
    return window.result || {};
  }

  function reviewedDesiredCap(){
    for(const id of ['review_f_desiredCap','f_desiredCap']){
      const input=typeof document!=='undefined'&&typeof document.getElementById==='function'?document.getElementById(id):null;
      if(!input||String(input.value).trim()==='')continue;
      const entered=Number(input.value);
      if(Number.isFinite(entered)&&entered>0)return entered>1?entered/100:entered;
    }
    return num(stateObj().desiredCap);
  }

  function years(){
    const s = stateObj();
    const r = resultObj();
    const hold = Math.max(1, Math.round(num(s.hold) || 1));
    return (r.years || []).filter(y => num(y.year) >= 1 && num(y.year) <= hold).slice(0, hold);
  }

  function branding(){
    let p = {};
    try { p = window.UserBranding?.getProfile?.() || {}; } catch (_e) {}
    const company = String(p.company_name || 'PropertyThesis').trim();
    const person = [p.full_name, p.professional_title].filter(Boolean).join(' • ').trim() || company;
    const contact = [p.email, p.phone, p.website].filter(Boolean).join(' • ').trim();
    const s = stateObj();
    const address = String(s.address || s.name || 'Income-Producing Property').trim();
    return {company, person, contact, address};
  }

  function pointsAmort(y){
    const s = stateObj(), r = resultObj();
    return s.loanYears && y.year <= s.loanYears ? num(r.pointCost) / num(s.loanYears) : 0;
  }

  function originationAmort(y){
    const s = stateObj();
    return s.loanYears && y.year <= s.loanYears ? num(s.origFee) / num(s.loanYears) : 0;
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('Excel library loaded but did not initialize.'));
      script.onerror = () => reject(new Error('Excel library could not be loaded.'));
      document.head.appendChild(script);
    });
  }

  async function loadXlsx(){
    if (window.XLSX) return window.XLSX;
    try {
      return await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    } catch (_e) {
      return await loadScript('https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js');
    }
  }

  function brandedRows(title){
    const b = branding();
    const rows = [[b.company], [title], [b.address], ['Prepared by: ' + b.person]];
    if (b.contact) rows.push(['Contact: ' + b.contact]);
    rows.push(['PropertyThesis • Know the Numbers. Prove the Case.'], []);
    return rows;
  }

  const cell = (f, v, z) => ({t:'n', f, v:num(v), z:z || '$#,##0;[Red]-$#,##0'});
  const colName = index => {
    let name = '';
    for (let n=index+1; n>0; n=Math.floor((n-1)/26)) name=String.fromCharCode(65+((n-1)%26))+name;
    return name;
  };

  function makeSheet(XLSX, title, header, bodyRows){
    const brand = brandedRows(title);
    const ws = XLSX.utils.aoa_to_sheet([...brand, header, ...bodyRows]);
    ws['!cols'] = [{wch:34}, ...header.slice(1).map(() => ({wch:15}))];
    return ws;
  }

  function buildWorkbook(XLSX){
    const ys = years();
    if (!ys.length) throw new Error('No projected analysis years are available to export. Open Review Results and confirm the analysis has completed.');

    const originalState = stateObj();
    const s = {...originalState, desiredCap:reviewedDesiredCap()};
    const r = resultObj();
    const hold = Math.max(1, Math.round(num(s.hold) || 1));
    const yearHeaders = ys.map(y => 'Year ' + y.year);
    const wb = XLSX.utils.book_new(), A="'Assumptions'!$B$";
    wb.CalcPr={calcMode:'auto'};

    const assumptions=[
      ['PropertyThesis Formula-Driven Pro Forma'],[branding().address],[],['Editable assumption','Value'],
      ['Acquisition Price',num(s.price)],['Land Value',num(s.land)],['Units',num(s.units)],['Monthly Rent',num(s.rent)],
      ['Annual Rent Growth',num(s.rentGrowth)],['Vacancy and Credit Loss',num(s.vacancy)],['Operating Expenses as % of EGI',num(s.opEx)],
      ['Depreciable Life (Years)',num(s.depLife)],['Annual Appreciation',num(s.appreciation)],['Holding Period (Years)',hold],
      ['Selling Costs',num(s.sellCost)],['Mortgage Amount',num(s.mortgage)],['Interest Only (1 = Yes)',s.interestOnly?1:0],
      ['Mortgage Rate',num(s.mortRate)],['Loan Term (Years)',num(s.loanYears)],['Mortgage Points',num(s.points)],
      ['Origination Fee',num(s.origFee)],['Ordinary Income Tax Rate',num(s.ordinaryTax)],['Depreciation Tax Rate',num(s.depTax)],
      ['Capital Gains Tax Rate',num(s.capGainsTax)],['Required Return',num(s.requiredReturn)],['Desired Cap Rate',num(s.desiredCap)],
      ['Desired GRM',num(s.desiredGrm)],['Initial Repairs',num(s.initialRepairs)]
    ];
    const assumptionSheet=XLSX.utils.aoa_to_sheet(assumptions);
    assumptionSheet['!cols']=[{wch:36},{wch:18}];
    for(const row of [8,9,10,12,14,17,19,21,22,23,24,25]){const c=assumptionSheet['B'+(row+1)];if(c)c.z='0.00%';}
    for(const row of [4,5,7,15,20,27]){const c=assumptionSheet['B'+(row+1)];if(c)c.z='$#,##0;[Red]-$#,##0';}
    XLSX.utils.book_append_sheet(wb,assumptionSheet,'Assumptions');

    const cfBrand=brandedRows('Projected After-Tax Cash Flow'),cfHeaderRow=cfBrand.length+1,cfFirst=cfHeaderRow+1;
    const cfRows=[
      ['Potential Gross Income',...ys.map((y,i)=>cell(i?`${colName(i)}${cfFirst}*(1+${A}9)`:`${A}8*${A}7*12`,y.pgi))],
      ['− Vacancy and Credit Losses',...ys.map((y,i)=>cell(`${colName(i+1)}${cfFirst}*${A}10`,y.vac))],
      ['= Effective Gross Income',...ys.map((y,i)=>cell(`${colName(i+1)}${cfFirst}-${colName(i+1)}${cfFirst+1}`,y.egi))],
      ['− Operating Expenses',...ys.map((y,i)=>cell(`${colName(i+1)}${cfFirst+2}*${A}11`,y.opex))],
      ['= Net Operating Income',...ys.map((y,i)=>cell(`${colName(i+1)}${cfFirst+2}-${colName(i+1)}${cfFirst+3}`,y.noi))],
      ['− Debt Service',...ys.map((y,i)=>cell(`IF(OR(${i+1}>${A}19,${A}16=0),0,IF(${A}17=1,${A}16*${A}18,-PMT(${A}18/12,${A}19*12,${A}16)*12))`,y.debt))],
      ['= Before-Tax Cash Flow',...ys.map((y,i)=>cell(`${colName(i+1)}${cfFirst+4}-${colName(i+1)}${cfFirst+5}`,num(y.noi)-num(y.debt)))],
      ['− Taxes from Operations',...ys.map((y,i)=>cell(`'Taxes From Operations'!${colName(i+1)}${cfFirst+7}`,y.opTax))],
      ['= After-Tax Cash Flow',...ys.map((y,i)=>cell(`${colName(i+1)}${cfFirst+6}-${colName(i+1)}${cfFirst+7}`,y.atcf))]
    ];
    XLSX.utils.book_append_sheet(wb,makeSheet(XLSX,'Projected After-Tax Cash Flow',['After-Tax Cash Flow (ATCF)',...yearHeaders],cfRows),'After Tax Cash Flow');

    const taxRows=[
      ['Net Operating Income',...ys.map((y,i)=>cell(`'After Tax Cash Flow'!${colName(i+1)}${cfFirst+4}`,y.noi))],
      ['− Interest',...ys.map((y,i)=>cell(`IF(OR(${i+1}>${A}19,${A}16=0),0,IF(${A}17=1,${A}16*${A}18,-CUMIPMT(${A}18/12,${A}19*12,${A}16,${i*12+1},${(i+1)*12},0)))`,y.interest))],
      ['− Depreciation',...ys.map(()=>cell(`(${A}5-${A}6)/${A}12`,r.depreciation))],
      ['− Amortization of Points',...ys.map(y=>cell(`IF(${y.year}<=${A}19,(${A}16*${A}20/100)/${A}19,0)`,pointsAmort(y)))],
      ['− Amortization of Origination Fee',...ys.map(y=>cell(`IF(${y.year}<=${A}19,${A}21/${A}19,0)`,originationAmort(y)))],
      ['= Taxable Income',...ys.map((y,i)=>cell(`${colName(i+1)}${cfFirst}-${colName(i+1)}${cfFirst+1}-${colName(i+1)}${cfFirst+2}-${colName(i+1)}${cfFirst+3}-${colName(i+1)}${cfFirst+4}`,y.taxable))],
      ['× Ordinary Income Tax Rate',...ys.map(()=>cell(`${A}22`,s.ordinaryTax,'0.00%'))],
      ['= Taxes from Operations',...ys.map((y,i)=>cell(`${colName(i+1)}${cfFirst+5}*${colName(i+1)}${cfFirst+6}`,y.opTax))]
    ];
    XLSX.utils.book_append_sheet(wb,makeSheet(XLSX,'Taxes From Operations',['Taxes From Operations',...yearHeaders],taxRows),'Taxes From Operations');

    // Match Review Results exactly: disposition taxes occur only in the selected sale year.
    // Earlier ownership years remain blank rather than showing hypothetical annual sales.
    const gainRate = hold === 1 ? num(s.ordinaryTax) : num(s.capGainsTax);
    const taxesGain = num(r.gain) * gainRate;
    const depTax = num(r.accDep) * num(s.depTax);
    const onlySaleYear = value => ys.map(y => num(y.year) === hold ? value : null);
    const saleFormula=(i,f,v,z)=>num(ys[i].year)===hold?cell(f,v,z):null;
    const saleRows=[
      ['Net Sales Price',...ys.map((y,i)=>saleFormula(i,`${A}5*(1+${A}13)^${A}14*(1-${A}15)`,r.netSale))],
      ['− Book Value',...ys.map((y,i)=>saleFormula(i,`${A}5-((${A}5-${A}6)/${A}12*${A}14)`,r.book))],
      ['= Gain (Loss) on Sale',...ys.map((y,i)=>saleFormula(i,`${colName(i+1)}${cfFirst}-${colName(i+1)}${cfFirst+1}`,r.gain))],
      ['× Applicable Gain Tax Rate',...ys.map((y,i)=>saleFormula(i,`IF(${A}14=1,${A}22,${A}24)`,gainRate,'0.00%'))],
      ['= Taxes Due on Gain/Loss',...ys.map((y,i)=>saleFormula(i,`${colName(i+1)}${cfFirst+2}*${colName(i+1)}${cfFirst+3}`,taxesGain))],
      ['Accumulated Depreciation',...ys.map((y,i)=>saleFormula(i,`(${A}5-${A}6)/${A}12*${A}14`,r.accDep))],
      ['× Depreciation Tax Rate',...ys.map((y,i)=>saleFormula(i,`${A}23`,s.depTax,'0.00%'))],
      ['= Taxes Due on Depreciation',...ys.map((y,i)=>saleFormula(i,`${colName(i+1)}${cfFirst+5}*${colName(i+1)}${cfFirst+6}`,depTax))],
      ['Taxes Due on Sale',...ys.map((y,i)=>saleFormula(i,`${colName(i+1)}${cfFirst+4}+${colName(i+1)}${cfFirst+7}`,r.saleTax))]
    ];
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, 'Taxes Due on Sale', ['Taxes Due on Sale', ...yearHeaders], saleRows), 'Taxes Due on Sale');

    const initialEquity=num(s.price)-num(s.mortgage)+num(r.pointCost)+num(s.origFee)+num(s.initialRepairs);
    const reversion=num(r.ater);
    const summary=[['PropertyThesis Investment Summary'],[branding().address],[],['Metric','Formula-Driven Result'],
      ['Acquisition Price',cell(`${A}5`,s.price)],['Year 1 NOI',cell(`'After Tax Cash Flow'!B${cfFirst+4}`,ys[0].noi)],
      ['Capitalization Rate',cell(`B6/B5`,r.cap,'0.00%')],['Desired Cap Rate',cell(`${A}26`,s.desiredCap,'0.00%')],
      ['Cap-Supported Value',cell(`B6/B8`,num(ys[0].noi)/num(s.desiredCap))],['Initial Equity',cell(`${A}5-${A}16+(${A}16*${A}20/100)+${A}21+${A}28`,initialEquity)],
      ['After-Tax Reversion',cell(`'Taxes Due on Sale'!${colName(hold)}${cfFirst}-'Taxes Due on Sale'!${colName(hold)}${cfFirst+8}-IF(${A}17=1,IF(${A}14>=${A}19,0,${A}16),MAX(0,-FV(${A}18/12,MIN(${A}14,${A}19)*12,PMT(${A}18/12,${A}19*12,${A}16),${A}16)))`,reversion)],
      [],['Investment Cash Flow',cell('-B10',-initialEquity),...ys.map((y,i)=>cell(`'After Tax Cash Flow'!${colName(i+1)}${cfFirst+8}${i===ys.length-1?'+B11':''}`,num(y.atcf)+(i===ys.length-1?reversion:0)))],
      ['Internal Rate of Return',cell(`IRR(B13:${colName(ys.length+1)}13)`,r.IRR,'0.00%')],['Net Present Value',cell(`NPV(${A}25,C13:${colName(ys.length+1)}13)+B13`,r.NPV)]
    ];
    const summarySheet=XLSX.utils.aoa_to_sheet(summary);summarySheet['!cols']=[{wch:28},...Array(ys.length+1).fill({wch:16})];
    XLSX.utils.book_append_sheet(wb,summarySheet,'Investment Summary');
    wb.SheetNames.splice(0,0,wb.SheetNames.pop());

    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let row = 0; row <= range.e.r; row++) {
        const label = String(ws[XLSX.utils.encode_cell({r:row, c:0})]?.v || '');
        for (let col = 1; col <= range.e.c; col++) {
          const cell = ws[XLSX.utils.encode_cell({r:row, c:col})];
          if (!cell || cell.t !== 'n') continue;
          if(/Rate|Growth|Vacancy|Expenses as %|Appreciation|Selling Costs|Required Return|Desired Cap/i.test(label))cell.z='0.00%';
          else if(/Desired GRM/i.test(label))cell.z='0.00x';
          else if(/Units|Life \(Years\)|Holding Period|Loan Term|Interest Only/i.test(label))cell.z='0.00';
          else cell.z='$#,##0;[Red]-$#,##0';
        }
      }
    }
    return wb;
  }

  async function download(){
    try {
      const ys = years();
      if (!ys.length) throw new Error('No projected analysis years are available to export. Open Review Results and confirm the analysis has completed.');
      const XLSX = await loadXlsx();
      const wb = buildWorkbook(XLSX);
      const s = stateObj();
      const filename = safeName((s.address || s.name || 'PropertyThesis') + ' Pro Forma') + '.xlsx';
      // A data URL works in browser shells that reject object-URL downloads,
      // while remaining a normal one-click download in Edge/Chrome.
      const base64=XLSX.write(wb,{bookType:'xlsx',type:'base64',compression:true});
      const a=document.createElement('a');
      a.href='data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,'+base64;
      a.download=filename;
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>a.remove(),0);
      return true;
    } catch (err) {
      console.error('PropertyThesis pro forma export failed', err);
      alert(err?.message || 'Unable to export the pro forma workbook.');
      return false;
    }
  }

  window.PropertyThesisProFormaDownload = {version:VERSION, download, buildWorkbook, years, stateObj, resultObj, reviewedDesiredCap};
})();
