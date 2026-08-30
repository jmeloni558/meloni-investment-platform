import { withSupabase } from 'npm:@supabase/server@^1';
import { corsHeaders, json } from '../_shared/cors.ts';

const allowedTypes = new Set(['Single Family', 'Condo', 'Townhouse', 'Manufactured', 'Multi-Family', 'Apartment', 'Land']);
const clean = (value: unknown, max = 120) => String(value ?? '').trim().slice(0, max);
const numberInRange = (value: unknown, min: number, max: number) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : null;
};

export default {
  fetch: withSupabase({ auth: 'user' }, async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const apiKey = Deno.env.get('RENTCAST_API_KEY');
    if (!apiKey) return json({ error: 'Listing search is not configured' }, 503);
    const body = await req.json().catch(() => ({}));
    const city = clean(body.city, 80);
    const state = clean(body.state, 2).toUpperCase();
    const zipCode = clean(body.zipCode, 10);
    const address = clean(body.address, 160);
    const radius = numberInRange(body.radius, 1, 100) ?? 25;
    if (!zipCode && !(city && state) && !address) return json({ error: 'Enter a ZIP code, a city and state, or a search address' }, 400);

    const limit = Math.round(numberInRange(body.limit, 1, 24) ?? 18);
    const offset = Math.round(numberInRange(body.offset, 0, 5000) ?? 0);
    const minPrice = numberInRange(body.minPrice, 0, 1000000000);
    const maxPrice = numberInRange(body.maxPrice, 0, 1000000000);
    const daysOld = numberInRange(body.daysOld, 1, 3650);
    const requestedTypes = Array.isArray(body.propertyTypes) ? body.propertyTypes.map((value: unknown) => clean(value, 30)).filter((value: string) => allowedTypes.has(value)) : [];
    const propertyTypes = requestedTypes.length ? [...new Set(requestedTypes)] : [...allowedTypes];
    const bedroomsMin = numberInRange(body.bedroomsMin, 0, 1000);
    const bathroomsMin = numberInRange(body.bathroomsMin, 0, 1000);
    const squareFootageMin = numberInRange(body.squareFootageMin, 0, 10000000);
    const squareFootageMax = numberInRange(body.squareFootageMax, 0, 10000000);
    const yearBuiltMin = numberInRange(body.yearBuiltMin, 1600, new Date().getFullYear() + 5);
    const yearBuiltMax = numberInRange(body.yearBuiltMax, 1600, new Date().getFullYear() + 5);
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) return json({ error: 'Minimum price cannot exceed maximum price' }, 400);
    if (squareFootageMin !== null && squareFootageMax !== null && squareFootageMin > squareFootageMax) return json({ error: 'Minimum square footage cannot exceed maximum square footage' }, 400);
    if (yearBuiltMin !== null && yearBuiltMax !== null && yearBuiltMin > yearBuiltMax) return json({ error: 'Minimum year built cannot exceed maximum year built' }, 400);
    const params = new URLSearchParams({ propertyType: propertyTypes.join('|'), status: 'Active', limit: String(limit), offset: String(offset), includeTotalCount: 'true' });
    if (address) { params.set('address', address); params.set('radius', String(radius)); }
    else if (zipCode) params.set('zipCode', zipCode);
    else if (city && state) { params.set('city', city); params.set('state', state); }
    if (minPrice !== null || maxPrice !== null) params.set('price', `${minPrice ?? 0}:${maxPrice ?? 1000000000}`);
    if (daysOld !== null) params.set('daysOld', `1:${Math.round(daysOld)}`);
    if (bedroomsMin !== null) params.set('bedrooms', `${bedroomsMin}:1000`);
    if (bathroomsMin !== null) params.set('bathrooms', `${bathroomsMin}:1000`);
    if (squareFootageMin !== null || squareFootageMax !== null) params.set('squareFootage', `${squareFootageMin ?? 0}:${squareFootageMax ?? 10000000}`);
    if (yearBuiltMin !== null || yearBuiltMax !== null) params.set('yearBuilt', `${yearBuiltMin ?? 1600}:${yearBuiltMax ?? new Date().getFullYear() + 5}`);

    console.log('[rentcast-sale-listings] request', { city, state, zipCode, propertyTypes, offset, limit, filtered: [...params.keys()].filter((key) => !['city', 'state', 'zipCode', 'propertyType', 'status', 'limit', 'offset', 'includeTotalCount'].includes(key)) });
    const response = await fetch(`https://api.rentcast.io/v1/listings/sale?${params}`, { headers: { Accept: 'application/json', 'X-Api-Key': apiKey } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('RentCast listing search failed', response.status, payload);
      return json({ error: response.status === 429 ? 'Listing search limit reached. Try again shortly.' : 'Unable to retrieve listings' }, response.status === 429 ? 429 : 502);
    }

    const listings = (Array.isArray(payload) ? payload : [])
      .filter((item) => propertyTypes.includes(item?.propertyType) && item?.status === 'Active')
      .map((item) => ({
        id: item.id, formattedAddress: item.formattedAddress, addressLine1: item.addressLine1,
        city: item.city, state: item.state, zipCode: item.zipCode, county: item.county,
        latitude: item.latitude, longitude: item.longitude, propertyType: item.propertyType,
        bedrooms: item.bedrooms, bathrooms: item.bathrooms, squareFootage: item.squareFootage,
        lotSize: item.lotSize, yearBuilt: item.yearBuilt, units: item.units, price: item.price,
        listingType: item.listingType, listedDate: item.listedDate, lastSeenDate: item.lastSeenDate,
        daysOnMarket: item.daysOnMarket, mlsName: item.mlsName, mlsNumber: item.mlsNumber,
        hoa: item.hoa ?? null, listingAgent: item.listingAgent ?? null, listingOffice: item.listingOffice ?? null,
      }));
    const totalCount = Number(response.headers.get('x-total-count'));
    console.log('[rentcast-sale-listings] success', { count: listings.length, totalCount: Number.isFinite(totalCount) ? totalCount : null });
    return json({ listings, offset, limit, totalCount: Number.isFinite(totalCount) ? totalCount : null, hasMore: listings.length === limit, filters: { propertyTypes, status: 'Active' }, source: 'RentCast' });
  }),
};
