'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisSampleProFormaVersion||0)>=VERSION)return;
  window.__propertyThesisSampleProFormaVersion=VERSION;

  const years=['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Year 7'];
  const cf={
    pgi:[21480,21909.6,22347.792,22794.74784,23250.6427968,23715.655652736,24189.96876579072],
    vac:[2148,2190.96,2234.7792,2279.474784,2325.06427968,2371.5655652736,2418.9968765790723],
    egi:[19332,19718.64,20113.0128,20515.273056,20925.57851712,21344.090087462402,21770.971889211647],
    opex:[7732.8,7887.456,8045.20512,8206.1092224,8370.231406848001,8537.636034984962,8708.388755684658],
    noi:[11599.2,11831.184,12067.80768,12309.1638336,12555.347110272,12806.45405247744,13062.583133526989],
    debt:[15169.632563831163,15169.632563831163,15169.632563831163,15169.632563831163,15169.632563831163,15169.632563831163,15169.632563831163],
    btcf:[-3570.432563831162,-3338.4485638311635,-3101.824883831163,-2860.4687302311613,-2614.285453559163,-2363.1785113537226,-2107.049430304174],
    tax:[-2155.6130370733063,-2048.7380760487745,-1937.7565820239188,-1822.4545544998402,-1702.604881400333,-1577.9664853739057,-1448.2834134102657],
    atcf:[-1414.8195267578558,-1289.710487782389,-1164.068301807244,-1038.014175731321,-911.6805721588303,-785.2120259798169,-658.7660168939085],
    interest:[12934.181625911158,12784.46933653783,12624.730537877631,12454.293736034495,12272.442465922539,12078.412279462167,11871.387532070145],
    taxable:[-7698.617989547522,-7316.9217001741945,-6920.559221513995,-6508.7662660708575,-6080.731719286903,-5635.594590621091,-5172.44076217952]
  };
  const dep=6363.636363636364;
  const sale={netSale:292095.0430384067,book:205454.54545454547,gain:86640.49758386123,gainRate:.15,taxesGain:12996.074637579184,accDep:44545.454545454544,depRate:.25,depTax:11136.363636363636,saleTax:24132.43827394282};

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;s.async=true;
      s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Excel library loaded but did not initialize.'));
      s.onerror=()=>reject(new Error('Excel library could not be loaded.'));
      document.head.appendChild(s);
    });
  }
  async function loadXlsx(){
    if(window.XLSX)return window.XLSX;
    try{return await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');}
    catch(_e){return await loadScript('https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js');}
  }

  function brand(title){
    return [
      ['PropertyThesis'],
      [title],
      ['Sample Investment Property • Tampa, FL'],
      ['Prepared by: PropertyThesis Sample Analysis'],
      ['Illustrative figures only • sample holding period'],
      ['PropertyThesis • Know the Numbers. Make the Offer.'],
      []
    ];
  }
  function makeSheet(XLSX,title,header,rows){
    const ws=XLSX.utils.aoa_to_sheet([...brand(title),header,...rows]);
    ws['!cols']=[{wch:34},...years.map(()=>({wch:15}))];
    const range=XLSX.utils.decode_range(ws['!ref']);
    for(let r=0;r<=range.e.r;r++){
      const label=String(ws[XLSX.utils.encode_cell({r,c:0})]?.v||'');
      for(let c=1;c<=range.e.c;c++){
        const cell=ws[XLSX.utils.encode_cell({r,c})];
        if(!cell||cell.t!=='n')continue;
        cell.z=/Tax Rate/.test(label)?'0.00%':'$#,##0;[Red]-$#,##0';
      }
    }
    return ws;
  }
  function blanks(){return [null,null,null,null,null,null];}
  function buildWorkbook(XLSX){
    const wb=XLSX.utils.book_new();
    const cfRows=[
      ['Potential Gross Income',...cf.pgi],
      ['− Vacancy and Credit Losses',...cf.vac],
      ['= Effective Gross Income',...cf.egi],
      ['− Operating Expenses',...cf.opex],
      ['= Net Operating Income',...cf.noi],
      ['− Debt Service',...cf.debt],
      ['= Before-Tax Cash Flow',...cf.btcf],
      ['− Taxes from Operations',...cf.tax],
      ['= After-Tax Cash Flow',...cf.atcf]
    ];
    XLSX.utils.book_append_sheet(wb,makeSheet(XLSX,'Projected After-Tax Cash Flow',['After-Tax Cash Flow (ATCF)',...years],cfRows),'After Tax Cash Flow');

    const taxRows=[
      ['Net Operating Income',...cf.noi],
      ['− Interest',...cf.interest],
      ['− Depreciation',...years.map(()=>dep)],
      ['− Amortization of Points',...years.map(()=>0)],
      ['− Amortization of Origination Fee',...years.map(()=>0)],
      ['= Taxable Income',...cf.taxable],
      ['× Ordinary Income Tax Rate',...years.map(()=>.28)],
      ['= Taxes from Operations',...cf.tax]
    ];
    XLSX.utils.book_append_sheet(wb,makeSheet(XLSX,'Taxes From Operations',['Taxes From Operations',...years],taxRows),'Taxes From Operations');

    const saleRows=[
      ['Net Sales Price',...blanks(),sale.netSale],
      ['− Book Value',...blanks(),sale.book],
      ['= Gain (Loss) on Sale',...blanks(),sale.gain],
      ['× Applicable Gain Tax Rate',...blanks(),sale.gainRate],
      ['= Taxes Due on Gain/Loss',...blanks(),sale.taxesGain],
      ['Accumulated Depreciation',...blanks(),sale.accDep],
      ['× Depreciation Tax Rate',...blanks(),sale.depRate],
      ['= Taxes Due on Depreciation',...blanks(),sale.depTax],
      ['Taxes Due on Sale',...blanks(),sale.saleTax]
    ];
    XLSX.utils.book_append_sheet(wb,makeSheet(XLSX,'Taxes Due on Sale',['Taxes Due on Sale',...years],saleRows),'Taxes Due on Sale');
    return wb;
  }
  async function download(){
    try{
      const XLSX=await loadXlsx();
      XLSX.writeFile(buildWorkbook(XLSX),'PropertyThesis Sample Pro Forma.xlsx',{compression:true});
      return true;
    }catch(err){
      console.error('PropertyThesis sample pro forma export failed',err);
      alert(err?.message||'Unable to generate the sample pro forma workbook.');
      return false;
    }
  }
  window.PropertyThesisSampleProForma={version:VERSION,download,buildWorkbook,data:{years,cf,dep,sale}};
})();
