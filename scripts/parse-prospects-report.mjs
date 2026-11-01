// Convert an accessibility export of Prospects' full Contact report to records.
// Keep input/output outside the public website checkout.
import { readFileSync, writeFileSync } from 'node:fs';
const [input, output, gridInput, expectedCount='81', expectedKeyword='BPO Contacts'] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node scripts/parse-prospects-report.mjs input.txt output.json');
const blocks = readFileSync(input, 'utf8').split(/^\t\d+ table\r?$/m).slice(1);
const records = blocks.map(block => {
  const fields = {};
  let label;
  for (const line of block.split('\n')) {
    const match = line.match(/^\t{7}\d+ container (.*)/);
    if (!match) continue;
    const value = match[1].trim();
    if (value.endsWith(':')) { label = value.replace(/\s*:\s*$/, ''); continue; }
    if (label) { (fields[label] ||= []).push(value); label = null; }
  }
  const first = key => fields[key]?.[0] || '';
  const text = [...block.matchAll(/^\t+\d+ text (.*)$/gm)].map(m => m[1].trim()).join('\n');
  return {
    name: first('Name'), company: first('Company'), job_title: first('Job Title'),
    address: first('Address 1'), emails: Object.entries(fields).filter(([k]) => /^Email/.test(k)).flatMap(([,v])=>v),
    phones: Object.entries(fields).filter(([k]) => /Phone|Fax/.test(k)).flatMap(([label,values])=>values.map(value=>({label,value}))),
    keywords: first('Keywords'), notes: [...block.matchAll(/^\t{4}\d+ text (.*)$/gm)].map(m=>m[1].trim()).join('\n'),
    source_text: text, source_fields: fields
  };
});
if (records.length !== Number(expectedCount) || records.some(r => !r.name || !r.keywords.includes(expectedKeyword))) throw new Error('Report count or keyword validation failed');
if (gridInput) {
  const grid = readFileSync(gridInput, 'utf8');
  const entries = [...grid.matchAll(/^\t{4}\d+ row (\d+)\r?\n([\s\S]*?)(?=^\t{4}\d+ row |^\t\d+ text |$(?![\s\S]))/gm)];
  const gridRows = entries.map(m => {
    const values = [...m[2].matchAll(/^\t{6}\d+ text (.*)$/gm)].map(v=>v[1].trim());
    return {name:values[0],id:m[1],stage:values[1],keywords:values[2]};
  });
  if(gridRows.length!==records.length) throw new Error('Grid/report count mismatch');
  for (const [index,record] of records.entries()) {
    const source = gridRows[index];
    if (source.name!==record.name) throw new Error('Grid/report order mismatch for '+record.name);
    record.source_id = source.id;
    record.source_fields['Sales Stage'] = [source.stage];
    record.keyword_names = source.keywords.split(';').map(x=>x.trim()).filter(Boolean);
    record.keywords = record.keyword_names.join('; ');
  }
}
writeFileSync(output, JSON.stringify(records, null, 2));
console.log(JSON.stringify({contacts:records.length,emails:records.reduce((n,r)=>n+r.emails.length,0),phones:records.reduce((n,r)=>n+r.phones.length,0),withNotes:records.filter(r=>r.notes).length}));
