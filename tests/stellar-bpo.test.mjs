import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { mapDemoRecord, applyDemoProposal } from '../stellar-bpo-record.mjs';


const context = vm.createContext({ structuredClone, console, TextEncoder, TextDecoder, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync(new URL('../bpo-core.stewart-95ae7db78877.js', import.meta.url), 'utf8'), context);
const core = context.PropertyThesisBPOCore;
const listing = {
  ListingKey: 'MFRsynthetic', ListingId: 'MFRTB1234567', OriginatingSystemName: 'mfrmls', MlgCanView: true,
  StreetNumber: '100', StreetName: 'Synthetic', StreetSuffix: 'Ave', City: 'Tampa', StateOrProvince: 'FL', PostalCode: '33603',
  PropertyType: 'Residential', StandardStatus: 'Closed', ListPrice: 420000, ClosePrice: 400000, OriginalListPrice: 450000,
  CloseDate: '2026-10-01', ListingContractDate: '2026-08-01', LivingArea: 1500, LivingAreaUnits: 'Square Feet',
  BedroomsTotal: 3, BathroomsFull: 2, BathroomsHalf: 1, ConcessionsAmount: 6000,
  PoolPrivateYN: true, PoolFeatures: ['In Ground'], Levels: ['One'], GarageYN: true,
  GarageSpaces: 2, AttachedGarageYN: true, CarportYN: false
};

test('maps sold prices, half baths and paid concessions without using asking price', () => {
  const proposal = mapDemoRecord(listing);
  assert.equal(proposal.fields.price, 400000);
  assert.equal(proposal.fields.baths, 2.5);
  assert.equal(proposal.fields.financing, 6000);
  assert.equal(proposal.fields.design, 'Ranch');
  assert.equal(proposal.fields.pool, 'Private in-ground');
  assert.equal(proposal.facts.originalListPrice, 450000);
});

test('pending comps use the active section and asking price', () => {
  const proposal = mapDemoRecord({ ...listing, StandardStatus: 'Pending' });
  assert.equal(proposal.group, 'active');
  assert.equal(proposal.fields.price, 420000);
  assert.equal(proposal.fields.date, '');
  assert.throws(() => applyDemoProposal(core, {}, proposal, 'sold.1'), /status/);
});

test('missing and zero values remain distinct', () => {
  const proposal = mapDemoRecord({ ...listing, ClosePrice: null, BathroomsHalf: undefined, ConcessionsAmount: 0 });
  assert.equal(proposal.fields.price, null);
  assert.equal(proposal.fields.baths, null);
  assert.equal(proposal.fields.financing, 0);
  assert.ok(proposal.warnings.length >= 2);
});

test('rental, unknown and nonresidential records cannot become a BPO sale or subject', () => {
  for(const PropertyType of ['Residential Lease','Land','Business Opportunity',undefined]) {
    const p=mapDemoRecord({...listing,PropertyType});
    assert.equal(p.group,null);
    assert.equal(p.fields.price,null);
    assert.throws(()=>applyDemoProposal(core,{},p,'subject'),/residential sale/);
  }
});

test('pool and area evidence are required for adjustments', () => {
  assert.equal(mapDemoRecord({ ...listing, PoolPrivateYN: false }).fields.pool, 'None');
  assert.equal(mapDemoRecord({ ...listing, PoolFeatures: ['Above Ground'] }).fields.pool, 'Above ground (no value)');
  assert.equal(mapDemoRecord({ ...listing, PoolFeatures: undefined }).fields.pool, '');
  assert.equal(mapDemoRecord({ ...listing, LivingAreaUnits: 'Square Meters' }).fields.gla, null);
});

test('unavailable listings are rejected', () => {
  assert.throws(() => mapDemoRecord({ ...listing, MlgCanView: false }), /available/);
  assert.throws(() => mapDemoRecord({ ...listing, OriginatingSystemName: 'other' }), /available/);
});

test('real BPO core keeps subject sale and list price separate', () => {
  const result = applyDemoProposal(core, {}, mapDemoRecord(listing), 'subject');
  assert.equal(result['sold.0.price'], '400000');
  assert.equal(result['active.0.price'], '420000');
  assert.equal(result['sold.0.baths'], '2.5');
  assert.equal(result['active.0.baths'], '2.5');
  assert.equal(result._mlsGridDemo, true);
});

test('real BPO adjustments deduct concessions from mapped sold price', () => {
  const result = applyDemoProposal(core, {}, mapDemoRecord(listing), 'sold.1');
  const adjusted = core.applyAdjustments(result).values;
  assert.equal(core.number(adjusted['sold.1.adj_financing']), -6000);
  assert.equal(core.number(adjusted['sold.1.adjusted']), 394000);
});

test('subject without a historical sale never inherits its asking price as a sale', () => {
 const result=applyDemoProposal(core,{},mapDemoRecord({...listing,StandardStatus:'Pending',ClosePrice:null,CloseDate:null}),'subject');
 assert.ok(!result['sold.0.price']);
 assert.ok(!result['sold.0.date']);
 assert.equal(result['active.0.price'],'420000');
});

test('reviewed slots cannot be overwritten by demo imports', () => {
  assert.throws(() => applyDemoProposal(core, {'sold.1.address': '200 Existing St'}, mapDemoRecord(listing), 'sold.1'), /empty slot/);
});


import {importSelection} from '../stellar-bpo-picker.mjs';
test('live picker preserves PDFs and client form, protects duplicate source',()=>{
 const proposal=mapDemoRecord(listing);
 const before={_clientTemplate:'rrr',_attachments:[{path:'existing.pdf',category:'market'}],field_0035:'Reviewed market note'};
 const next=importSelection(core,before,proposal,'subject');
 assert.deepEqual(next._attachments,before._attachments);assert.equal(next._clientTemplate,'rrr');assert.equal(next.field_0035,'Reviewed market note');
 assert.throws(()=>importSelection(core,next,proposal,'sold.1'),/already/);
 assert.equal(before['sold.0.address'],undefined);
});
test('live workflow keeps uploads and manual entry and gates demo client exports',()=>{
 const ui=fs.readFileSync(new URL('../bpo-workspace.js',import.meta.url),'utf8');
 for(const term of ['Upload &amp; Analyze Sources','data-manual','data-upload','stellar_bpo_enabled','data-stellar-picker','Demo listings are for testing only'])assert.ok(ui.includes(term),term);
 assert.ok(ui.includes('if(stellarAllowed&&contentStep<=2)'));
});
