"use strict";
function neighborhood(v){
 const n=k=>{const s=String(v[k]??'').trim().replace(/[$,%]/g,'');return s!==''&&Number.isFinite(Number(s))?Number(s):null;};
 const fmt=x=>x.toLocaleString('en-US',{maximumFractionDigits:2});
 const money=x=>'$'+Math.round(x).toLocaleString('en-US');
 const out=[], trend=[['field_0033','declined'],['field_0036','increased'],['field_0037','stable']].filter(([k])=>v[k]===true);
 const pct=n('market_price_change_percent'),months=n('market_price_change_months');
 if(trend.length===1){const verb=trend[0][1];if(verb==='stable')out.push('Home values in the reported market have remained stable'+(months>0?' over the past '+fmt(months)+' months':'')+'.');else if(pct!==null&&months>0)out.push('Home values in the reported market have '+verb+' '+fmt(Math.abs(pct))+'% over the past '+fmt(months)+' months.');}
 const supply=n('market_months_supply');if(supply!==null&&supply>=0)out.push('Available inventory represents '+fmt(supply)+' months of supply.');
 const zip=String(v.market_zip||'').trim(),county=String(v.market_county||'').trim().replace(/\s+County$/i,'');
 if(zip&&county){
 for(const [key,label,format] of [['median_home_value','median home value',money],['median_list_price','median asking price',money],['median_home_age','median home age',x=>fmt(x)+' years']]){
 const z=n('market_zip_'+key),c=n('market_county_'+key);
 if(z!==null&&c!==null)out.push('The '+label+' is '+format(z)+' in ZIP code '+zip+', compared with '+format(c)+' across '+county+' County.');
 else if(z!==null)out.push('ZIP code '+zip+' has a '+label+' of '+format(z)+'.');else if(c!==null)out.push(county+' County has a '+label+' of '+format(c)+'.');
 }
 const z=n('market_zip_list_price_12month_change'),c=n('market_county_list_price_12month_change');
 const movement=x=>x===0?'remained unchanged':(x>0?'risen ':'fallen ')+fmt(Math.abs(x))+'%';
 if(z!==null&&c!==null)out.push('Over the past 12 months, asking prices have '+movement(z)+' in the ZIP area and '+movement(c)+' countywide.');
 else if(z!==null)out.push('Asking prices in ZIP code '+zip+' have '+movement(z)+' over the past 12 months.');else if(c!==null)out.push('Asking prices in '+county+' County have '+movement(c)+' over the past 12 months.');
 }else{
 for(const area of ['zip','county']){const place=area==='zip'?zip:county;if(!place)continue;const label=area==='zip'?'ZIP code '+place:place+' County';
 for(const [key,name,format] of [['median_home_value','median home value',money],['median_list_price','median asking price',money],['median_home_age','median home age',x=>fmt(x)+' years']]){const x=n('market_'+area+'_'+key);if(x!==null)out.push('The '+name+' in '+label+' is '+format(x)+'.');}
 const change=n('market_'+area+'_list_price_12month_change');if(change!==null)out.push('Asking prices in '+label+' have '+(change===0?'remained unchanged':(change>0?'risen ':'fallen ')+fmt(Math.abs(change))+'%')+' over the past 12 months.');
 }
 }
 const own=n('field_0038'),rent=n('field_0039'),valid=x=>x!==null&&x>=0&&x<=100;
 if(valid(own)&&valid(rent)&&Math.abs(own+rent-100)<=1)out.push('The reported neighborhood housing mix is approximately '+fmt(own)+'% owner occupied and '+fmt(rent)+'% renter occupied.');
 else if(valid(own)&&rent===null)out.push('Owner-occupied homes represent '+fmt(own)+'% of the reported neighborhood housing mix.');
 else if(valid(rent)&&own===null)out.push('Renter-occupied homes represent '+fmt(rent)+'% of the reported neighborhood housing mix.');
 return out.join(' ');
}
module.exports={neighborhood};
