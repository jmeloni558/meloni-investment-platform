export const editorialInstructions=`Write like a broker explaining the property to a client: direct, conversational, measured and specific. Say "The home is in good condition" or "Its updated interior gives it an advantage over the dated listings" when supported. Avoid "reported as", "reported in", "is described as", "is noted to", "the observation records", "as entered", "the grid applies", and "the analyst notes". Preserve genuine uncertainty with a specific qualification, not repetitive source-attribution language. State the desktop/inspection limitation once where relevant.
The subject section should explain the home's appeal and meaningful limitations, not list every amenity or missing feature. The market section should connect relevant trends to pricing and buyer choices rather than recite every ZIP and county statistic.
For each comparable, lead with why it is useful and the one or two differences that matter most to buyer appeal or the value conclusion. Do not walk through every form row, adjustment, net total and adjusted price in every paragraph. The form already contains that arithmetic. Keep every required adjustment reason in the structured adjustment records, but use a dollar adjustment in narrative only when its magnitude materially explains weighting, an outlier or the final value. Use the primary adjusted indication and overall sold range where they clarify reconciliation. Avoid repeating those figures in multiple sections. A longer report must earn its length through analysis, not a catalog of facts or adjustments.
In the conclusion, explain how the strongest closed-sale evidence and competing listings support the entered opinion. Check descriptions such as lower, middle or upper against the actual numerical range. Do not add an alternate value or recommended list price to a summary-only report. Preserve the established headers, section order and conversational professional voice.
Ownership evidence is property-specific. A checked REO / corporate owned box combines two different categories and does not by itself establish foreclosure, bank ownership or a distressed sale. Corporate ownership, an LLC name, a low price, pending status and long marketing time do not establish REO. Special Sale: None is not affirmative REO evidence. For a summary-only report, use only the supplied ownershipEvidence permission for a specific property. A full AI BPO may establish that permission from its required per-property formEvidence quote from the original MLS and must keep its narrative consistent with the validated form decision; a source/checkbox conflict belongs in review warnings, not a speculative REO paragraph. Do not invent pressure on sellers, negotiation dynamics or buyer behavior from an ambiguous ownership flag. Do not claim there are no REOs in the wider market just because these comps do not establish one.`;

// Conservative interpretation of explicit ownership statements, not owner-name inference.
export function ownershipSupport(evidence){
 const s=String(evidence??'').replace(/[–—]/g,'-');
 const combined=/\bREO\s*[/&]\s*corporate(?:[- ]owned| ownership)?\s*[:=]?\s*(?:yes|true)\b/i.test(s);
 const negative=/\b(?:no|not|non)[ -]*(?:an?\s+)?(?:REO|bank[- ]owned|corporate[- ]owned)|\b(?:REO|bank[- ]owned|corporate[- ]owned)\s*[:=]\s*(?:no|false|none)\b|special sale\s*:\s*none\b/i.test(s);
 const corporateNegative=/\b(?:no|not|non)[ -]*(?:an?\s+)?corporate[- ]owned|\bcorporate[- ]owned\s*[:=]\s*(?:no|false|none)\b/i.test(s);
 const explicit=/special sale\s*:\s*[^.;\n]*(?:\bREO\b|bank[- ]owned|real estate owned)|\b(?:REO|bank[- ]owned|real estate owned)\s*[:=]\s*(?:yes|true)\b|\b(?:is|was)\s+(?:an?\s+)?(?:REO|bank[- ]owned)\b/i.test(s);
 const corporate=/special sale\s*:\s*corporate[- ]owned\b|\bcorporate[- ]owned\s*[:=]\s*(?:yes|true)\b|\b(?:is|was)\s+corporate[- ]owned\b/i.test(s);
 return {reo:explicit&&!combined&&!negative,corporate:corporate&&!combined&&!corporateNegative,negative:negative&&!corporate};
}
export function ownershipEvidence(values){
 const result={};
 for(const kind of ['sold','active'])for(let i=0;i<=3;i++){
  if(kind==='active'&&i===0)continue;
  const prefix=kind+'.'+i,key=prefix+'.reo',source=values._aiFields?.[key],checked=values[key];
  const support=ownershipSupport(source?.removed?'':source?.evidence);
  const conflict=checked===true&&(support.negative||source?.value===false);
  result[i===0?'subject':prefix]={reo:checked===true&&support.reo&&!conflict,corporate:checked===true&&support.corporate&&!conflict,needsReview:checked===true&&(!support.reo&&!support.corporate||conflict),conflict};
 }
 return result;
}
export function validateEditorial(sections,input){
 for(const section of sections){
  if(/\breported (?:as|in)\b|\bthe observation records\b|\bthe grid applies\b/i.test(section.body))throw Error('Rewrite source-attribution boilerplate as natural broker prose; preserve genuine uncertainty and explain relevance rather than reciting the adjustment grid.');
  const context=input.ownershipEvidence||{},permissions=['market','conclusion'].includes(section.id)?Object.values(context):[context[section.id]||{}];
  if(/\bREO\b|\bbank[- ]owned\b|\breal estate owned\b|\bforeclos(?:ed|ure)\b/i.test(section.body)&&!permissions.some(x=>x.reo))throw Error('Remove unsupported REO/foreclosure discussion from '+section.id+'. The combined ownership checkbox is not proof of bank ownership.');
  if(/\bcorporate[- ]owned\b|\bcorporate ownership\b/i.test(section.body)&&!permissions.some(x=>x.corporate))throw Error('Remove unsupported corporate ownership discussion from '+section.id+'.');
 }
}
