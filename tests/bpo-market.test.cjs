const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../operations/bpo/core.cjs');
test('neighborhood report quantities preserve geography, signed changes and source precision',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 const data={market_zip:'33543',market_county:'Pasco County',market_zip_median_home_value:'406340',market_county_median_home_value:'$339K',market_zip_median_list_price:'$449K',market_county_median_list_price:'$345K',market_zip_list_price_12month_change:'+2.2%',market_county_list_price_12month_change:'+4.6%',market_zip_median_home_age:'16',market_county_median_home_age:'30',market_months_supply:'4.19',field_0038:'85%',field_0039:'15%',market_price_change_percent:'-7%',market_price_change_months:'12'};
 const fields=Object.entries(data).map(([name,value])=>({name,value,document:0,page:2,evidence:name+' '+value}));
 fields.push({name:'field_0025',value:'unknown',document:0,page:3,evidence:'Market Type'});
 fields.push({name:'market_zip_median_home_age',value:'—',document:0,page:2,evidence:'not available'});
 const r=cleanExtraction({fields,warnings:[]},C.schema,[{path:'market.pdf',name:'Neighborhood report.pdf'}]);const v=C.applyAI({},r).values;
 assert.equal(v.market_months_supply,'4.2');assert.equal(v.market_zip_median_home_value,'406340');assert.equal(v.market_county_median_home_value,'339000');assert.equal(v.market_zip_median_list_price,'449000');assert.equal(v.market_county_median_list_price,'345000');assert.equal(v.market_zip_list_price_12month_change,'2.2');assert.equal(v.market_county_list_price_12month_change,'4.6');assert.equal(v.market_price_change_percent,'7');assert.equal(v.field_0033,true);assert.equal(v.field_0025,undefined);assert.equal(v.field_0047,undefined);assert.equal(v.field_0038,'85');assert.equal(v.field_0039,'15');
 assert.equal(C.applyAI({market_months_supply:'5.1'},r).values.market_months_supply,'5.1');
});
test('missing market quantities remain blank rather than becoming zero',async()=>{
 const {cleanExtraction}=await import('../supabase/functions/bpo-extract/contract.mjs');
 for(const value of ['—','unknown','N/A','not provided']){const r=cleanExtraction({fields:[{name:'market_months_supply',value,document:0,page:1,evidence:'Inventory '+value}],warnings:[]},C.schema,[{path:'market.pdf',name:'Other report.pdf'}]);assert.equal(r.fields.length,0);}
});
