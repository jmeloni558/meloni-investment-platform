// Demo catalog adapter. This never mutates a saved property or report evidence.
export function incomeListing(proposal, purpose = 'subject') {
  if (!['subject', 'sales', 'income'].includes(purpose)) throw Error('Choose a supported listing use.');
  if (proposal?.isDemo !== true || proposal.provider !== 'MLS Grid' || !proposal.listingKey ||
      !['Residential', 'Residential Income'].includes(proposal.facts?.propertyType) ||
      !['sold', 'active'].includes(proposal.group)) throw Error('An eligible Stellar demo listing is required.');
  const p = structuredClone(proposal), f = p.fields, facts = p.facts;
  if (!f?.address?.trim()) throw Error('The listing address is missing.');
  if (purpose !== 'subject' && (p.group !== 'sold' || !(facts.salePrice > 0) || !validDate(facts.saleDate))) {
    throw Error('Sales and income comps require a closed sale with a sale price and valid date. Asking prices are not closed sales.');
  }
  const units = Number.isInteger(facts.units) && facts.units > 0 ? facts.units : '';
  return {
    isDemo: true, listingKey: p.listingKey, purpose,
    address: f.address, status: f.status, listPrice: facts.listPrice, salePrice: facts.salePrice,
    saleDate: facts.saleDate, squareFeet: f.gla, beds: f.beds, baths: f.baths, units,
    source: f.source, warnings: [...(p.warnings || []), 'Rents and expenses are not supplied by this demo mapping. Review and enter them separately.'],
    draft: {assumptions: {address: f.address, price: facts.salePrice ?? '', units, rent: ''},
      evidence: {saleDate: facts.saleDate || '', incomeBasis: 'mls', period: 'Period not specified by source', source: f.source || 'Stellar MLS demo'}}
  };
}
function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
}
