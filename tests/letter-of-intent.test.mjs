import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTerms,renderLetter,completedAnalysis,digest,NONBINDING} from '../supabase/functions/letter-of-intent/letter.mjs';
const sample = () => ({buyer:'Example Investor LLC',sender:'Test Owner',role:'Buyer / investor',brokerage:'',recipientName:'Test Recipient',recipientEmail:'owner@example.com',price:425000,deposit:5000,financing:'Cash',diligenceDays:15,closingDays:30,test:true});
test('LOI spells out proposed values and nonbinding scope without private underwriting',()=>{
  const letter=renderLetter(validateTerms(sample()),'1501 Test Ave','owner@example.com','2026-09-04');
  assert.match(letter.subject,/^\[TEST — DO NOT ACT\]/);assert.ok(letter.text.includes(NONBINDING));
  assert.match(letter.text,/\$425,000.00/);assert.match(letter.text,/\$5,000.00/);assert.match(letter.text,/15 calendar days/);
  assert.doesNotMatch(letter.text,/signature required|accept this offer/i);
  assert.match(letter.text,/No signature or acceptance is requested/);
});
test('email and header injection are rejected',()=>{
  for(const recipientEmail of ['a@example.com\r\nBcc:b@example.com','a@example.com,b@example.com','missing','<a@example.com>']) assert.throws(()=>validateTerms({...sample(),recipientEmail}));
  assert.throws(()=>validateTerms({...sample(),buyer:'A\nB'}));
});
test('proposed terms reject invalid amounts, periods and roles',()=>{
  for(const bad of [{price:NaN},{price:-1},{deposit:500000},{deposit:0.001},{diligenceDays:1.5},{closingDays:0},{role:'Administrator'},{financing:'Anything'},{role:'Authorized buyer representative',brokerage:''}]) assert.throws(()=>validateTerms({...sample(),...bad}));
});
test('letter escapes user text in HTML and keeps text literal',()=>{
  const letter=renderLetter(validateTerms({...sample(),buyer:'<img src=x onerror=alert(1)>'}),'Test','owner@example.com','2026-09-04');
  assert.ok(!letter.html.includes('<img'));assert.ok(letter.html.includes('&lt;img'));assert.ok(letter.text.includes('<img'));
});
test('empty, incomplete and unsaved analyses cannot qualify',()=>{
  const a={property_id:'test',assumptions:{price:500000,rent:3500},outputs:{year1_noi:20000,irr:0.08}};
  assert.equal(completedAnalysis(a),true);
  for(const bad of [null,{}, {...a,property_id:null},{...a,outputs:{}},{...a,assumptions:{price:0,rent:0}},{...a,outputs:{year1_noi:null,irr:0}}]) assert.equal(completedAnalysis(bad),false);
});
test('preview hash changes when content or recipient changes',async()=>{
  assert.equal(await digest('same'),await digest('same'));assert.notEqual(await digest('same'),await digest('changed'));
});
