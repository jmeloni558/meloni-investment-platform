'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {preparedStewart}=require('../operations/portal-import/stewart/adapter');
const {importStewartComps}=require('../operations/portal-import/stewart/import');
test('defaults matched subject and comp cells, moves legacy concession once, and creates one repair',async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage(),url='https://www.protk.com/ProTeck.Fulfillment.Case.Forms/CaseFormPortal/DataEntry/12';
 const input=(id,value='')=>'<input id="'+id+'" value="'+value+'">';
 const select=(id,text)=>'<select id="'+id+'"><option></option><option>'+text+'</option></select>';
 const radio=(id,name)=>'<input type="radio" id="'+id+'" name="'+name+'">';
 const pairs={SellerType:'Owner',TransactionType:'Fair Market',OwnershipType:'Fee Simple (Owner)',UnitsInProperty:'1',HeatingType:'Heat Pump',FuelType:'Electric'};
 const subject=k=>({TransactionType:'MLSTransactionHistory_SubjectTransactionType',UnitsInProperty:'Subject_UnitCountType'}[k]||'Subject_'+k)+'_field';
 const grid=Object.entries(pairs).map(([k,v])=>select(subject(k),v)+select('CompSale_'+k+'_1_field',v)).join('');
 const sale=(id,v)=>input('CompSale_'+id+'_1_field',v);
 const html='<h1>1 Oak St Tampa FL 33617</h1>'+grid+sale('Address','2 Oak St')+sale('LivingArea','1250')+
 ['TotalBasementArea','FinishedBasementArea'].map(k=>input(subject(k))+sale(k)).join('')+
 sale('FinancingConcessions')+sale('SalesConcessions')+input('CompSaleAdjustments_SalesConcessions_1_field','-$1,250')+input('CompSaleAdjustments_FinancingConcessions_1_field')+
 radio('SubjectRepairData_InteriorRepairs_field_Yes','interior')+radio('SubjectRepairData_ExteriorRepairs_field_No','exterior')+select('Subject_RecommendedListing_field','As Repaired')+
 '<div id="interiorRepairGrid"><table><tr><td>'+select('repair_item_xyz','Other')+input('repair_cost_xyz')+select('repair_recommendation_xyz','Repair')+select('repair_reason_xyz','Normal Wear &amp; Tear')+input('repair_comment_xyz')+radio('radio_yes_recommendedxyz','recommended')+radio('radio_yes_lenderReqxyz','lender')+'</td></tr></table></div>';
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(url);
 const c={kind:'sold',address:'2 Oak St',mls:'',locality:'',fields:{Comments:'Seller concessions -$1,250'}};
 const transfer=preparedStewart({subject:{address:'1 Oak Street',state:'FL',zip:'33617'},comps:[c]});
 for(let i=0;i<2;i++)assert.doesNotMatch((await page.evaluate(importStewartComps,transfer)).join('\n'),/Stopped:/);
 for(const [k,v] of Object.entries(pairs)){assert.equal(await page.inputValue('#'+subject(k)),v);assert.equal(await page.inputValue('#CompSale_'+k+'_1_field'),v);}
 for(const k of ['TotalBasementArea','FinishedBasementArea']){assert.equal(await page.inputValue('#'+subject(k)),'0');assert.equal(await page.inputValue('#CompSale_'+k+'_1_field'),'0');}
 for(const [id,v] of Object.entries({CompSale_FinancingConcessions_1_field:'1250',CompSaleAdjustments_FinancingConcessions_1_field:'-1250',CompSale_SalesConcessions_1_field:'0',CompSaleAdjustments_SalesConcessions_1_field:'0',repair_item_xyz:'Other',repair_cost_xyz:'50',repair_recommendation_xyz:'Repair',repair_reason_xyz:'Normal Wear & Tear',repair_comment_xyz:'no repairs required',Subject_RecommendedListing_field:'As Repaired'}))assert.equal(await page.inputValue('#'+id),v);
 for(const id of ['radio_yes_recommendedxyz','radio_yes_lenderReqxyz','SubjectRepairData_ExteriorRepairs_field_No','SubjectRepairData_InteriorRepairs_field_Yes'])assert.ok(await page.locator('#'+id).isChecked());
 }finally{await browser.close();}
});
