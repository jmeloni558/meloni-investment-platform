import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url);
test('only the site branding module writes the browser title across shared scripts',()=>{
  for(const file of readdirSync(root).filter(f=>f.endsWith('.js'))){
    if(file==='propertythesis-branding.js')continue;
    const source=readFileSync(new URL(file,root),'utf8');
    assert.doesNotMatch(source,/document\s*\.\s*title\s*=(?!=)/,file);
  }
});
test('profile modules keep report branding without overriding site identity',()=>{
  for(const file of ['profile-system.js','user-profile-branding.js']){
    const source=readFileSync(new URL(file,root),'utf8');
    assert.match(source,/function applyReportBranding\(/);
    assert.doesNotMatch(source,/textContent\s*=\s*['"]Investment Property Analyzer/);
    assert.doesNotMatch(source,/Prepared with the Investment Property Analyzer/);
  }
});
test('production bootstrap requests the stable-title release assets',()=>{
  assert.match(readFileSync(new URL('index.html',root),'utf8'),/20260907-stable-site-title-v1/);
});
