 'use strict';
const norm=s=>String(s||'').toUpperCase().replace(/\bDRIVE\b/g,'DR').replace(/\bSTREET\b/g,'ST').replace(/\bAVENUE\b/g,'AVE').replace(/\bROAD\b/g,'RD').replace(/[^A-Z0-9]/g,'');
function parse(text){
 const t=String(text||'').replace(/\r/g,'').replace(/\u00a0/g,' '), lines=t.split('\n').map(x=>x.trim()).filter(Boolean);
 const h=t.match(/County Tax Report\s*-\s*([^,\n]+),\s*([^,\n]+),\s*([A-Z]{2})\s+(\d{5})/i);
 if(!h||!/^\d+\s+/.test(h[1]))return [];
 const get=re=>t.match(re)?.[1]?.trim(),number=s=>Number(s.replace(/[$,\s]/g,''));
 const row={category:'tax',address:h[1]+', '+h[2]+', '+h[3]+' '+h[4],parcel:get(/PID\s*#\s*([\d -]+)/i),county:get(/([^\n]+?) County Tax Report/i),lotAcres:get(/Total Lot Size:\s*([\d.]+)\s*acres/i),zoning:get(/Zoning:\s*([A-Z0-9-]+)\//i)};
 const header=lines.find(x=>/^(?:20\d\d\s+){1,}20\d\d\s*\*?$/.test(x)&&lines.indexOf(x)>lines.findIndex(x=>x.startsWith('Estimated Current Value:')));
 if(header){const years=header.match(/20\d\d/g);for(const [label,key] of [['Total Assessed Value','assessed'],['Land Value','land'],['Total Tax Amount','tax']]){const line=lines.find(x=>x.startsWith(label+':'));const cells=line?.slice(label.length+1).match(/\$[\d,]+(?:\.\d+)?|-\s*n\/a\s*-/gi);if(cells?.length===years.length){for(let i=years.length-1;i>=0;i--)if(cells[i].startsWith('$')){row[key]=number(cells[i]);row[key+'Year']=years[i];break;}}}}
 const sale=t.match(/Deed Type:[^\n]*?Price:\s*\$([\d,]+)[^\n]*\n\s*Sale Date:\s*(\d{2}\/\d{2}\/\d{4})/i);if(sale){row.lastSalePrice=number(sale[1]);row.lastSaleDate=sale[2];}
 row.preliminary=/Preliminary Values/i.test(t);return [row];
}
function matching(rows,v){const a=norm(v['sold.0.address']),z=String(v['sold.0.zip']||'').slice(0,5);const found=rows.filter(r=>r.category==='tax'&&norm(r.address.split(',')[0])===a&&z&&r.address.endsWith(z));if(!found.length)return {};const out={};for(const k of ['parcel','county','lotAcres','zoning','assessed','assessedYear','land','landYear','tax','taxYear','lastSalePrice','lastSaleDate','preliminary']){const vals=[...new Set(found.map(r=>r[k]))];if(vals.length===1&&vals[0]!==undefined)out[k]=vals[0];}return out;}
module.exports={parse,matching};
