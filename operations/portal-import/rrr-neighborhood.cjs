"use strict";
function neighborhood(v){
 const n=k=>{const s=String(v[k]??'').trim().replace(/[$,%]/g,'');return s!==''&&Number.isFinite(Number(s))?Number(s):null;};
 const fmt=x=>x.toLocaleString('en-US',{maximumFractionDigits:2});
 const money=x=>'$'+Math.round(x).toLocaleString('en-US');
 const out=[], trend=[['field_0033','declined'],['field_0036','increased'],['field_0037','stable']].filter(([k])=>v[k]===true);
 const pct=n('market_price_change_percent'),months=n('market_price_change_months');
 if(trend.length===1){const verb=trend[0][1];if(verb==='stable')out.push('Home values in the reported market have remained stable'+(months>0?' over the past '+fmt(months)+' months':'')+'.');else if(pct!==null&&months>0)out.push('Home values in the reported market have '+verb+' '+fmt(Math.abs(pct))+'% over the past '+fmt(months)+' months.');}
 const supply=n('market_months_supply');if(supply!==null&&supply>=0)out.push('Available inventory represents '+fmt(supply)+' months of supply.');
 for(const area of ['zip','county']){
 const place=String(v['market_'+area]||'').trim();if(!place)continue;
 const label=area==='zip'?'ZIP code '+place:place.replace(/\s+County$/i,'')+' County';
 const value=n('market_'+area+'_median_home_value'),list=n('market_'+area+'_median_list_price'),change=n('market_'+area+'_list_price_12month_change'),age=n('market_'+area+'_median_home_age');
 if(value!==null&&list!==null)out.push('In '+label+', the median home value is '+money(value)+', compared with a median asking price of '+money(list)+'.');
 else if(value!==null)out.push('The median home value in '+label+' is '+money(value)+'.');else if(list!==null)out.push('The median asking price in '+label+' is '+money(list)+'.');
 if(change!==null)out.push('Asking prices in '+label+' have '+(change===0?'remained unchanged':(change>0?'risen ':'fallen ')+fmt(Math.abs(change))+'%')+' over the past 12 months.');
 if(age!==null&&age>=0)out.push('Homes in '+label+' have a median age of '+fmt(age)+' years.');
 }
 const own=n('field_0038'),rent=n('field_0039'),valid=x=>x!==null&&x>=0&&x<=100;
 if(valid(own)&&valid(rent)&&Math.abs(own+rent-100)<=1)out.push('The reported neighborhood housing mix is approximately '+fmt(own)+'% owner occupied and '+fmt(rent)+'% renter occupied.'+(own+rent!==100?' The reported percentages are rounded.':''));
 else if(valid(own)&&rent===null)out.push('Owner-occupied homes represent '+fmt(own)+'% of the reported neighborhood housing mix.');
 else if(valid(rent)&&own===null)out.push('Renter-occupied homes represent '+fmt(rent)+'% of the reported neighborhood housing mix.');
 if(out.length)out.push('These area-wide figures provide context for the comparable sales; they do not establish the subject’s value or a change in its individual value.');
 return out.join(' ');
}
module.exports={neighborhood};
