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
 const hazardYes=['AppearStructurallySound','OnPermanentFoundation','KitchenAndBathFunctional','ElectricalSystemFunctioning','PlumbingSepticWaterSystemsWorking','RoofFreeOfLeaks','RoofFreeOfTemporaryRepairs','HvacSystemFunctional','PropertyFreeOfEnvironmentalHazards','PropertyFreeOfLeadBasedPaint'];
 const moneyKeys=['InitialCleaningAmount','InitialTrashOutAmount','InitialYardCleaningAmount','HealthAndSafetyAmount','OtherMaintenanceAmount','InitialPoolCleaningAmount','PoolPreservationAmount'];
 const decisions=['InFinanceableCondition','TitleLegalIssues','HealthSafetyIssues','EnvironmentalIssues','ImmediateAttentionRequired','InspectionRecommended'];
 const condition=k=>'SubjectCondition_'+k+'_field';
 const controls=[...hazardYes,'PropertyFreeOfWoodInsects','WoodInsectInspectionPerformed'].map(k=>'<select id="'+condition(k)+'"><option></option><option>Yes</option><option>No</option><option>Unknown</option></select>').join('')+moneyKeys.map(k=>input(condition(k))).join('')+decisions.map(k=>radio(condition(k)+'_Yes',k)+radio(condition(k)+'_No',k)).join('');
 const openingRadios=['Subject_IsReportCompletedUsingValidityInspection','Subject_MixedUseOrCommercial'];
 const openingSelects={Subject_HasIllegalUnits:'No',Property_Zoning:'Residential',Subject_RealEstateTaxPaymentSchedule:'Annually'};
 const opening=openingRadios.map(k=>radio(k+'_field_No',k)+radio(k+'_field_Yes',k)).join('')+Object.entries(openingSelects).map(([k,v])=>select(k+'_field',v)).join('');
 const html='<h1>1 Oak St Tampa FL 33617</h1>'+opening+controls+grid+sale('Address','2 Oak St')+sale('LivingArea','1250')+
 ['TotalBasementArea','FinishedBasementArea'].map(k=>input(subject(k))+sale(k)).join('')+
 sale('FinancingConcessions')+sale('SalesConcessions')+input('CompSaleAdjustments_SalesConcessions_1_field','-$1,250')+input('CompSaleAdjustments_FinancingConcessions_1_field')+
 radio('SubjectRepairData_InteriorRepairs_field_Yes','interior')+radio('SubjectRepairData_ExteriorRepairs_field_No','exterior')+select('Subject_RecommendedListing_field','As Repaired')+
 '<div id="interiorRepairGrid"><table><tr><td>'+select('repair_item_xyz','Other')+select('repair_subcategory_xyz','Other')+input('repair_cost_xyz')+select('repair_recommendation_xyz','Repair')+select('repair_reason_xyz','Normal Wear &amp; Tear')+input('repair_comment_xyz')+radio('radio_yes_recommendedxyz','recommendedxyz')+radio('radio_yes_lenderReqxyz','lenderxyz')+'<a alt="Delete row"><img class="remove-row" width="14" height="14"></a></td></tr></table><textarea class="notRecommendedRepairComments">dddd</textarea></div>';
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(url);
 await page.evaluate(()=>{
   // Every edit to an unsaved row can issue another create. Model the delay
   // between its first change and Stewart replacing the temporary ID.
   window.creates=0;
   document.querySelector('#interiorRepairGrid').addEventListener('change',e=>{
     if(!e.target.id.endsWith('xyz'))return;
     window.creates++;
     setTimeout(()=>document.querySelectorAll('#interiorRepairGrid [id$="xyz"]').forEach(el=>{el.id=el.id.replace('xyz','123');el.name=el.name.replace('xyz','123');}),350);
   });
   document.querySelector('#interiorRepairGrid').addEventListener('click',e=>{if(e.target.matches('.remove-row'))e.target.closest('tr').remove();});
 });
 const c={kind:'sold',address:'2 Oak St',mls:'',locality:'',fields:{Comments:'Seller concessions -$1,250'}};
 const transfer=preparedStewart({subject:{address:'1 Oak Street',state:'FL',zip:'33617'},comps:[c]});
 for(let i=0;i<2;i++)assert.doesNotMatch((await page.evaluate(importStewartComps,transfer)).join('\n'),/Stopped:/);
 for(const [k,v] of Object.entries(pairs)){assert.equal(await page.inputValue('#'+subject(k)),v);assert.equal(await page.inputValue('#CompSale_'+k+'_1_field'),v);}
 for(const k of ['TotalBasementArea','FinishedBasementArea']){assert.equal(await page.inputValue('#'+subject(k)),'0');assert.equal(await page.inputValue('#CompSale_'+k+'_1_field'),'0');}
 assert.equal(await page.evaluate(()=>window.creates),1);
 for(const [id,v] of Object.entries({CompSale_FinancingConcessions_1_field:'1250',CompSaleAdjustments_FinancingConcessions_1_field:'-1250',CompSale_SalesConcessions_1_field:'0',CompSaleAdjustments_SalesConcessions_1_field:'0',repair_item_123:'Other',repair_cost_123:'50',repair_recommendation_123:'Repair',repair_reason_123:'Normal Wear & Tear',repair_comment_123:'no repairs required',Subject_RecommendedListing_field:'As Repaired'}))assert.equal(await page.inputValue('#'+id),v);
 for(const id of ['radio_yes_recommended123','radio_yes_lenderReq123','SubjectRepairData_ExteriorRepairs_field_No','SubjectRepairData_InteriorRepairs_field_Yes'])assert.ok(await page.locator('#'+id).isChecked());
 for(const k of openingRadios)assert.ok(await page.locator('#'+k+'_field_No').isChecked());
 for(const [k,v] of Object.entries(openingSelects))assert.equal(await page.inputValue('#'+k+'_field'),v);
 assert.equal(await page.inputValue('#repair_subcategory_123'),'Other');
 assert.equal(await page.inputValue('.notRecommendedRepairComments'),'');
 await page.locator('.notRecommendedRepairComments').fill('Reviewed by agent');
 for(const k of hazardYes)assert.equal(await page.inputValue('#'+condition(k)),'Yes');
 assert.equal(await page.inputValue('#'+condition('PropertyFreeOfWoodInsects')),'Unknown');
 assert.equal(await page.inputValue('#'+condition('WoodInsectInspectionPerformed')),'No');
 for(const k of decisions)assert.ok(await page.locator('#'+condition(k)+(k==='InFinanceableCondition'?'_Yes':'_No')).isChecked());
 for(const k of moneyKeys)assert.equal(await page.inputValue('#'+condition(k)),k==='InitialCleaningAmount'?'250':'0');
 await page.evaluate(()=>{
   const row=document.querySelector('#interiorRepairGrid tr');
   for(let i=124;i<=130;i++){
     const clone=row.cloneNode(true);
     for(const e of clone.querySelectorAll('input,select')){
       const orig=row.querySelector('[id="'+e.id+'"]');e.id=e.id.replace('123',String(i));e.name=e.name.replace('123',String(i));e.value=orig.value;e.checked=orig.checked;
     }
     row.parentElement.appendChild(clone);
     if(i===130){clone.querySelector('[id^=repair_comment_]').value='Actual separate repair';clone.querySelector('[id^=repair_subcategory_]').value='';}
   }
 });
 await page.evaluate(importStewartComps,transfer);
 assert.equal(await page.locator('#interiorRepairGrid tr').count(),2);
 assert.equal(await page.inputValue('#repair_subcategory_130'),'');
 assert.equal(await page.inputValue('.notRecommendedRepairComments'),'Reviewed by agent');
 assert.equal(await page.inputValue('#repair_comment_130'),'Actual separate repair');
 assert.equal(await page.inputValue('#repair_comment_123'),'no repairs required');
 }finally{await browser.close();}
});
