import {applyDemoProposal} from './stellar-bpo-record.mjs';
const slots={subject:'Subject','sold.1':'Sold comp 1','sold.2':'Sold comp 2','sold.3':'Sold comp 3','active.1':'Active / pending comp 1','active.2':'Active / pending comp 2','active.3':'Active / pending comp 3'};
const money=n=>n===null||n===undefined?'Not supplied':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const element=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
export function importSelection(core,values,proposal,target){
 if(Object.values(values._mlsGridSources||{}).some(s=>s.listingKey===proposal.listingKey))throw Error('This listing is already in this BPO.');
 return core.applyAdjustments(applyDemoProposal(core,values,proposal,target)).values;
}
export function mount({host,client,core,mode,isCurrent,getValues,apply}){
 if(!host)return;let request=0;const current=()=>host.isConnected&&isCurrent();
 const details=element('details','');details.className='pt-stellar-picker';const summary=element('summary','Alternative: Search Stellar listings (private demo)');details.append(summary);
 details.append(element('p','Optional alternative to PDF uploads and manual entry. This limited MLS Grid demo catalog is not a live MLS feed. Imported facts fill empty subject or comparable slots; existing reviewed listings are not replaced.'));
 const toolbar=element('div','');toolbar.className='pt-stellar-search';const label=element('label','Address, city, ZIP or MLS number'),query=element('input','');query.type='search';query.maxLength=100;label.append(query);
 const statusLabel=element('label','Listing status'),group=element('select','');for(const [v,t] of [['','All eligible'],['sold','Sold'],['active','Active / pending']]){const o=element('option',t);o.value=v;group.append(o);}statusLabel.append(group);
 const search=element('button','Search Stellar demo');search.type='button';toolbar.append(label,statusLabel,search);details.append(toolbar);
 const notice=element('p',''),results=element('div',''),review=element('section','');notice.setAttribute('role','status');results.className='pt-stellar-results';details.append(notice,results,review);host.append(details);
 async function runSearch(){const sequence=++request;search.disabled=true;results.replaceChildren();review.replaceChildren();notice.textContent='Searching private demo catalog…';
 try{let q=client.from('mls_grid_demo_catalog').select('listing_key,address,listing_id,comp_group,proposal',{count:'exact'}).order('address').limit(20);const term=query.value.trim().replace(/[^\p{L}\p{N}\s.-]/gu,'').slice(0,100);if(term)q=q.or(`address.ilike.%${term}%,listing_id.ilike.%${term}%`);if(group.value)q=q.eq('comp_group',group.value);
 const {data,error,count}=await q;if(!current()||sequence!==request)return;if(error)throw Error('Stellar search is unavailable for this account. PDF uploads and manual entry are still available.');notice.textContent=`${count} matching demo records; showing ${data.length}. Narrow the search as needed.`;
 for(const r of data){const card=element('article','');card.append(element('strong',r.address),element('p',r.proposal.fields.status+' · '+money(r.proposal.fields.price)+' · MLS '+r.listing_id));const b=element('button','Review Stellar listing');b.type='button';b.onclick=()=>reviewListing(r.proposal);card.append(b);results.append(card);}
 }catch(e){if(current())notice.textContent=e.message;}finally{if(current()&&sequence===request)search.disabled=false;}}
 function reviewListing(p){review.replaceChildren(element('h3',p.fields.address));review.append(element('p',`Sale price: ${money(p.facts.salePrice)} · List price: ${money(p.facts.listPrice)} · Living area: ${p.fields.gla??'Not supplied'} · Beds: ${p.fields.beds??'Not supplied'} · Baths: ${p.fields.baths??'Not supplied'}`),element('p',`Garage: ${p.fields.garage||'Not supplied'} · Pool: ${p.fields.pool||'Not supplied'} · Seller concessions: ${money(p.facts.concessions)}`));for(const warning of p.warnings)review.append(element('p',warning));
 const label=element('label','Add listing to'),target=element('select','');const v=getValues();for(const [key,name] of Object.entries(slots)){if(mode==='subject'&&key!=='subject'||mode==='comps'&&key==='subject'||key!=='subject'&&!key.startsWith(p.group+'.'))continue;const full=key==='subject'?v.field_0008||v['sold.0.address']||v['active.0.address']:v[key+'.address'];const o=element('option',name+(full?' — already filled':''));o.value=key;o.disabled=Boolean(full);target.append(o);}label.append(target);review.append(label);
 const add=element('button','Use reviewed Stellar listing');add.type='button';add.disabled=![...target.options].some(o=>!o.disabled);add.onclick=async()=>{if(!current())return;add.disabled=true;try{const access=await client.rpc('stellar_bpo_enabled');if(!current())return;if(access.error||access.data!==true)throw Error('Stellar access is no longer enabled.');apply(importSelection(core,getValues(),p,target.value));}catch(e){if(current()){notice.textContent=e.message;add.disabled=false;}}};review.append(add);if(add.disabled)review.append(element('p','All matching slots already contain data. Use the existing manual/PDF workflow to review those records.'));
 }
 search.onclick=runSearch;query.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();runSearch();}};
}
