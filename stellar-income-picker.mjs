import {incomeListing} from './stellar-income-record.mjs';

export function mount({host, client, isCurrent, subjectName, previewIncome}) {
  const doc = host.ownerDocument;
  const el = (tag, text) => { const n = doc.createElement(tag); n.textContent = text; return n; };
  const money = v => v == null ? 'Not supplied' : Number(v).toLocaleString('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
  let sequence = 0;
  host.replaceChildren(el('h3', 'Stellar listings for ' + subjectName), el('p',
    'Private demo — review subject information, comparable sales, or an income-comp analysis. Demo facts cannot be saved to this property or included in client reports. Existing comp methods remain available.'));
  const label = el('label', 'Address, city, ZIP or MLS number'), query = el('input', '');
  query.type = 'search'; query.maxLength = 100; label.append(query);
  const purposeLabel = el('label', 'Use listing for'), purpose = el('select', '');
  for (const [value, text] of [['subject','Subject information'], ['sales','Comparable sales'], ['income','Income comps']]) {
    const option = el('option', text); option.value = value; purpose.append(option);
  }
  purposeLabel.append(purpose);
  const button = el('button', 'Search Stellar demo'); button.type = 'button'; button.className = 'btn primary';
  const status = el('p', ''), results = el('div', ''), review = el('section', ''); status.setAttribute('role', 'status');
  host.append(label, purposeLabel, button, status, results, review);
  const current = () => host.isConnected && isCurrent();
  async function search() {
    const ticket = ++sequence, use = purpose.value; button.disabled = true; results.replaceChildren(); review.replaceChildren();
    status.textContent = 'Searching Stellar demo…';
    try {
      const access = await client.rpc('stellar_bpo_enabled');
      if (!current() || ticket !== sequence) return;
      if (access.error || access.data !== true) throw Error('Stellar access is not enabled for this account.');
      let q = client.from('mls_grid_demo_catalog').select('listing_key,proposal', {count: 'exact'}).order('address').limit(20);
      const term = query.value.trim().replace(/[^\p{L}\p{N}\s.-]/gu, '').slice(0,100);
      if (term) q = q.or(`address.ilike.%${term}%,listing_id.ilike.%${term}%`);
      if (use !== 'subject') q = q.eq('comp_group', 'sold');
      const response = await q;
      if (!current() || ticket !== sequence) return;
      if (response.error) throw Error('Stellar search failed. Existing comp methods remain available.');
      status.textContent = `${response.count ?? response.data.length} matching records; showing up to 20. Narrow the search as needed.`;
      for (const row of response.data) {
        let mapped; try { mapped = incomeListing(row.proposal, use); } catch { continue; }
        const card = el('article', ''), choose = el('button', 'Review listing'); choose.type = 'button'; choose.className = 'btn secondary';
        card.append(el('strong', mapped.address), el('p', `${mapped.status} · Sold: ${money(mapped.salePrice)} · Asking: ${money(mapped.listPrice)}`), choose);
        choose.onclick = () => show(mapped, ticket); results.append(card);
      }
    } catch (error) { if (current() && ticket === sequence) status.textContent = error.message; }
    finally { if (current() && ticket === sequence) button.disabled = false; }
  }
  function show(record, ticket) {
    if (!current() || ticket !== sequence) return;
    review.replaceChildren(el('h3', record.address), el('p', record.source), el('p',
      `Units: ${record.units || 'Not supplied'} · Living area: ${record.squareFeet ?? 'Not supplied'} sq ft · Beds: ${record.beds ?? 'Not supplied'} · Baths: ${record.baths ?? 'Not supplied'}`));
    for (const warning of record.warnings) review.append(el('p', warning));
    review.append(el('p', 'Your saved subject, assumptions and report selections have not changed.'));
    if (record.purpose === 'income') {
      const start = el('button', 'Try income analysis with this demo sale'); start.type = 'button'; start.className = 'btn primary';
      start.onclick = async () => {
        start.disabled = true;
        try {
          const access = await client.rpc('stellar_bpo_enabled');
          if (!current() || ticket !== sequence) return;
          if (access.error || access.data !== true) throw Error('Stellar access is no longer enabled.');
          previewIncome(record.draft);
        } catch (error) { if (current()) { status.textContent = error.message; start.disabled = false; } }
      };
      review.append(start);
    }
  }
  purpose.onchange = () => { sequence++; button.disabled = false; results.replaceChildren(); review.replaceChildren(); status.textContent = 'Click Search Stellar demo for this use.'; };
  button.onclick = search; query.onkeydown = e => { if(e.key === 'Enter') { e.preventDefault(); search(); } };
}
