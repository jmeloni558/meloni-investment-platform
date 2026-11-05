// Deterministic proposal mapping. Review these fields before applying them to a BPO.
function number(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (String(value).trim() === '') return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

function text(value) {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').join(', ');
  return typeof value === 'string' ? value.trim() : '';
}

function date(value) {
  const result = text(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) return '';
  const parsed = new Date(result);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(result) ? result : '';
}

export function mapDemoRecord(row) {
  if (row.OriginatingSystemName !== 'mfrmls' || row.MlgCanView !== true || !text(row.ListingKey)) {
    throw new Error('Record is not an available Stellar MLS demo listing.');
  }
  const warnings = [];
  const street = [row.StreetNumber, row.StreetDirPrefix, row.StreetName, row.StreetSuffix,
    row.StreetDirSuffix, row.UnitNumber ? `Unit ${row.UnitNumber}` : ''].filter(Boolean).join(' ');
  // Construct from components to avoid duplicating city/state from UnparsedAddress.
  const address = street ? [street, row.City, [row.StateOrProvince, row.PostalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ') : text(row.UnparsedAddress);
  const status = text(row.StandardStatus);
  const residentialSale = ['Residential','Residential Income'].includes(text(row.PropertyType));
  const group = !residentialSale ? null : status === 'Closed' ? 'sold' : ['Active', 'Pending', 'Active Under Contract'].includes(status) ? 'active' : null;
  if (!residentialSale) warnings.push('This pilot accepts residential sale listings only, not leases or other property types.');
  const fullBaths = number(row.BathroomsFull);
  const halfBaths = number(row.BathroomsHalf);
  const baths = fullBaths !== null && halfBaths !== null ? fullBaths + halfBaths / 2 : null;
  if (baths === null) warnings.push('Bathroom breakdown is incomplete; review full and half baths.');
  const levels = text(row.Levels).toLowerCase();
  const stories = levels === 'one' ? 1 : levels === 'two' ? 2 : null;
  let pool = '';
  const poolFeatures = text(row.PoolFeatures);
  if (row.PoolPrivateYN === false) pool = 'None';
  else if (row.PoolPrivateYN === true) {
    if (/above[ -]?ground/i.test(poolFeatures)) pool = 'Above ground (no value)';
    else if (/in[ -]?ground/i.test(poolFeatures)) pool = 'Private in-ground';
    else warnings.push('Private pool reported, but in-ground construction needs confirmation.');
  }
  const garageSpaces = number(row.GarageSpaces);
  const carportSpaces = number(row.CarportSpaces);
  const parking = [];
  if (row.GarageYN === false) parking.push('0 attached');
  else if (garageSpaces !== null && typeof row.AttachedGarageYN === 'boolean') {
    parking.push(`${garageSpaces} ${row.AttachedGarageYN ? 'attached' : 'detached'}`);
  }
  if (row.CarportYN === true && carportSpaces !== null) parking.push(`${carportSpaces} carport`);
  else if (row.CarportYN === true) warnings.push('Carport space count needs review.');
  const livingArea = number(row.LivingArea);
  const squareFeet = !row.LivingAreaUnits || row.LivingAreaUnits === 'Square Feet';
  if (!squareFeet) warnings.push('Living area is not stated in square feet; review before size adjustments.');
  const listingId = text(row.ListingId).replace(/^MFR/, '');
  const fields = {
    address, status, price: group === 'sold' ? number(row.ClosePrice) : group === 'active' ? number(row.ListPrice) : null,
    gla: squareFeet ? livingArea : null,
    beds: number(row.BedroomsTotal), baths, year: number(row.YearBuilt),
    site: number(row.LotSizeSquareFeet) === null ? '' : `${number(row.LotSizeSquareFeet)} sq ft`,
    date: group === 'sold' ? date(row.CloseDate) : '',
    dom: number(row.DaysOnMarket), source: `Stellar MLS demo / MLS ${listingId}`,
    garage: parking.join(', '), pool, hvac: text(row.Cooling),
    design: stories === 1 ? 'Ranch' : stories === 2 ? '2 story' : text(row.ArchitecturalStyle),
    stories, tenure: text(row.Ownership), financing: number(row.ConcessionsAmount)
  };
  if (!address || !street) warnings.push('Review the complete street address before import.');
  if (!group) warnings.push('This status is not eligible for an active or sold comparable.');
  if (fields.price === null) warnings.push('The applicable sale/list price is missing.');
  // Preserve source facts separately from the legacy form contract.
  return {
    isDemo: true, provider: 'MLS Grid', listingKey: row.ListingKey, group,
    modified: text(row.ModificationTimestamp), fields,
    facts: {
      listPrice: number(row.ListPrice), salePrice: number(row.ClosePrice), saleDate: date(row.CloseDate),
      originalListPrice: number(row.OriginalListPrice), listDate: date(row.ListingContractDate),
      buyerFinancing: text(row.BuyerFinancing), saleType: text(row.SpecialListingConditions),
      fullBaths, halfBaths, propertyType: text(row.PropertyType), propertySubType: text(row.PropertySubType),
      units: number(row.NumberOfUnitsTotal), concessions: number(row.ConcessionsAmount)
    }, warnings
  };
}

export function applyDemoProposal(core, values, proposal, target) {
  if (proposal.isDemo !== true) throw new Error('A demo proposal is required.');
  if (!['Residential','Residential Income'].includes(proposal.facts.propertyType) || !proposal.group) throw new Error('A residential sale listing with an eligible status is required.');
  if (target !== 'subject' && !/^(sold|active)\.[1-3]$/.test(target)) throw new Error('Invalid BPO target.');
  if (target !== 'subject' && !target.startsWith(`${proposal.group}.`)) throw new Error('Comparable status does not match the chosen section.');
  if (!core.validAddress(proposal.fields.address)) throw new Error('Review the full address before import.');
  const prefix = target === 'subject' ? 'sold.0' : target;
  if (values[prefix + '.address'] || (target === 'subject' && values.field_0008)) {
    throw new Error('Demo import requires an empty slot so reviewed facts are preserved.');
  }
  let next = core.applyRecord(values, proposal.fields, target);
  if (target === 'subject') {
    // Subject asking and historical sold prices are independent.
    for (const [key, value] of Object.entries({
      'sold.0.price': proposal.facts.salePrice,
      'active.0.price': proposal.facts.listPrice,
      'sold.0.date': proposal.facts.saleDate
    })) {
      if (value !== null && value !== '') next[key] = String(value);
      else delete next[key];
    }
  } else if (proposal.group === 'sold' && proposal.facts.concessions !== null) {
    next[target + '.financing'] = String(proposal.facts.concessions);
  }
  next._mlsGridDemo = true;
  next._mlsGridSources = { ...(values._mlsGridSources || {}), [target]: {
    listingKey: proposal.listingKey, modified: proposal.modified, facts: proposal.facts,
    warnings: proposal.warnings, source: 'Stellar MLS demo'
  } };
  return core.recalculate(next);
}
