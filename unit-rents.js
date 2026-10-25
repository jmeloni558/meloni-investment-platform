/* Per-unit rents are stored alongside the compatible average used by calculation engines. */
'use strict';
(()=>{
 const valid=v=>v!==''&&v!==null&&Number.isFinite(Number(v))&&Number(v)>=0;
 function ensure(a,units=a.units,average=a.rent){
  const n=Number(units);if(!Number.isInteger(n)||n<1||n>10000)throw Error('Enter a whole unit count between 1 and 10,000.');
  let rents=Array.isArray(a.unitRents)?a.unitRents.slice():null;
  if(!rents)rents=Array(n).fill(valid(average)?Number(average):'');
  else {rents=rents.slice(0,n);while(rents.length<n)rents.push('');}
  a.unitRents=rents;return rents;
 }
 function total(rents){return rents.reduce((s,v)=>s+(valid(v)?Number(v):0),0);}
 function complete(rents){return rents.length>0&&rents.every(valid)&&total(rents)>0;}
 function sync(a){a.rent=complete(a.unitRents)?total(a.unitRents)/a.unitRents.length:0;return a.rent;}
 function fields(a,escape){return a.unitRents.map((v,i)=>`<label class="gw-field">Unit ${i+1} monthly rent ($)<input data-unit-rent="${i}" type="number" min="0" step="0.01" value="${escape(v)}" aria-label="Unit ${i+1} monthly rent"></label>`).join('');}
 document.addEventListener('change',e=>{if(e.target?.id==='f_units'&&typeof state==='object'&&Array.isArray(state.unitRents)){const n=Number(e.target.value);if(Number.isInteger(n)&&n>0&&n<=10000){ensure(state,n);sync(state);const rent=document.getElementById('f_rent');if(rent)rent.value=state.rent;}}});
 window.PropertyThesisUnitRents={ensure,total,complete,sync,fields};
})();
