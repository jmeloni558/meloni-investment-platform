import test from 'node:test';
import assert from 'node:assert/strict';
import {subjectMlsFallback} from '../supabase/functions/bpo-extract/contract.mjs';

test('a unit in a separate MLS header component is retained and checked',()=>{
  const header='U1234567\u00a0\u00a010 Example Trl, #7, Sample City, FL 33111';
  const pages=[header+' Beds: 3 Year Built: 1988 Heated Area:1,668 SqFt Baths: 2/0'];
  const read=(input,expected)=>Object.fromEntries(subjectMlsFallback(input,0,expected,[]).map(f=>[f.name,f.value]));
  const facts=read(pages,'10 Example Trail Unit 7, Sample City, FL 33111');
  assert.equal(facts.field_0008,'10 Example Trl #7, Sample City, FL 33111');
  assert.equal(facts['sold.0.gla'],'1,668');
  assert.equal(facts['sold.0.baths'],'2');
  assert.deepEqual(read(pages,'10 Example Trl #8'),{});
  assert.deepEqual(read([...pages,header.replace('#7','#8')],null),{});
});
