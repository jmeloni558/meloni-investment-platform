import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSubjectPages} from '../supabase/functions/bpo-extract/contract.mjs';

test('only the newest matching listing and its continuation pages are used',()=>{
  const expected='12 Paradise Point Drive #7, Tampa, FL 33647';
  const header='12 Paradise Pointe Dr, #7, Tampa, FL 33647';
  const old='1234567 '+header+' Sold Date: 03/31/2005';
  const recent='T2216041 '+header+' Sold Date: 04/06/2007';
  for(const [pages,want] of [[[old,"continued",recent,"continued"],[2,3]],[[recent,"continued",old],[0,1]]]){
    assert.deepEqual(selectSubjectPages(pages,expected).pages,want);
  }
  assert.ok(selectSubjectPages([old,recent.replace('04/06/2007','03/31/2005')],expected).warning);
  assert.deepEqual(selectSubjectPages([old,recent.replace('#7','#8')],expected).pages,[0]);
});
