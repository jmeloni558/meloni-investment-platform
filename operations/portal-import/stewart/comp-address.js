'use strict';

// Older transfers sometimes store the mailing address in the street field alone.
function normalizeStewartComp(comp) {
  const end = comp.address.match(/^(.+?)[,\s]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
  if (!end) return comp;
  const [, line, state, zip] = end;
  const separated = line.match(/^(.+?),\s*([A-Z][A-Z .'-]*)$/i);
  const streetAndCity = separated || line.match(/^(.+\b(?:trail|trl|street|st|avenue|ave|drive|dr|lane|ln|road|rd|court|ct|boulevard|blvd|circle|cir|place|pl|way|terrace|ter)\.?(?:[,\s]+(?:#\s*|unit\s+|apt\s+)[\w-]+)?)\s+([A-Z][A-Z .'-]*)$/i);
  if (!streetAndCity) return comp;
  const locality = [streetAndCity[2].trim(), state, zip].join(' ');
  const tokens = text => text.replace(/[.,]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
  const existing = tokens(comp.locality || '');
  if ((comp.zip && comp.zip !== zip) || (existing && !(' '+tokens(locality)+' ').includes(' '+existing+' '))) {
    throw Error('Conflicting address details for '+comp.address+'. Review the comp in PropertyThesis.');
  }
  return {...comp, address:streetAndCity[1].trim(), locality, zip};
}
if (typeof module !== 'undefined') module.exports = {normalizeStewartComp};
