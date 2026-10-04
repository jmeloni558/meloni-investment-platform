'use strict';

(()=>{

  const VERSION=3;

  if((window.__propertyThesisSampleProFormaVersion||0)>=VERSION)return;

  window.__propertyThesisSampleProFormaVersion=VERSION;



  const years=['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Year 7'];

  const cf={"pgi":[52800,53856,54933.12,56031.78240000001,57152.41804799999,58295.46640896,59461.3757371392],"vac":[5280,5385.6,5493.312000000001,5603.178240000001,5715.2418048,5829.546640896,5946.137573713921],"egi":[47520,48470.4,49439.808000000005,50428.60416000001,51437.176243199996,52465.919768064,53515.23816342528],"opex":[19008,19388.16,19775.923200000005,20171.441664000005,20574.87049728,20986.3679072256,21406.095265370113],"noi":[28512,29082.24,29663.8848,30257.162496000004,30862.305745919995,31479.551860838397,32109.14289805517],"debt":[45474.91425133582,45474.91425133582,45474.91425133582,45474.91425133582,45474.91425133582,45474.91425133582,45474.9142513333],"interest":[15711.681235172182,13718.382398496446,11591.588647134022,9322.359579415417,6901.156038413687,4317.800012195957,1561.4318485204922],"taxable":[5927.591492100545,8491.130328776282,11199.568880138708,14062.075643857315,17088.422434779037,20289.02457591517,23674.983776807403],"atcf":[-18622.63986912397,-18770.190743393174,-18946.908737774655,-19155.13293561586,-19397.36678715395,-19676.289271753667,-19994.766810784204],"btcf":[-16962.914251335817,-16392.674251335815,-15811.029451335817,-15217.751755335812,-14612.608505415821,-13995.36239049742,-13365.77135327813],"tax":[1659.7256177881527,2377.5164920573593,3135.8792864388383,3937.3811802800487,4784.758281738131,5680.926881256248,6628.995457506074]};

  const dep=6872.727272727273;

  const sale={"netSale":372713.2749170069,"book":270890.90909090906,"gain":101822.36582609784,"gainRate":0.15,"taxesGain":8056.991237551039,"accDep":48109.09090909091,"depRate":0.25,"depTax":12027.272727272728,"saleTax":20084.263964823767};



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

      ['= Tax on Remaining Positive Gain',...blanks(),sale.taxesGain],

      ['Accumulated Depreciation',...blanks(),sale.accDep],

      ['× Depreciation Tax Rate',...blanks(),sale.depRate],

      ['= Tax on Depreciation-Related Gain',...blanks(),sale.depTax],

      ['Taxes Due on Sale',...blanks(),sale.saleTax]

    ];

    XLSX.utils.book_append_sheet(wb,makeSheet(XLSX,'Taxes Due on Sale',['Taxes Due on Sale',...years],saleRows),'Taxes Due on Sale');

    return wb;

  }

  window.PropertyThesisSampleProForma={version:VERSION,buildWorkbook,data:{years,cf,dep,sale}};

})();

