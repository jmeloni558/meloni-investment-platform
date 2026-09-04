'use strict';
(() => {
  const VERSION = 3;
  if ((window.__reportProFormaExcelFinalV || 0) >= VERSION) return;
  window.__reportProFormaExcelFinalV = VERSION;

  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const esc = v => String(v ?? '').replace(/[&<>\"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const safeName = v => String(v || 'PropertyThesis Pro Forma').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 90);
  const money = v => Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0}) : 'N/A';
  const pct = (v, d = 2) => Number.isFinite(Number(v)) ? (Number(v) * 100).toFixed(d) + '%' : 'N/A';

  function branding() {
    let p = {};
    try { p = window.UserBranding?.getProfile?.() || {}; } catch (_e) {}
    const company = String(p.company_name || 'PropertyThesis').trim();
    const person = [p.full_name, p.professional_title].filter(Boolean).join(' • ').trim();
    const contact = [p.email, p.phone, p.website].filter(Boolean).join(' • ').trim();
    const logo = String(p.logo_url || '').trim();
    const accent = /^#[0-9a-f]{6}$/i.test(p.brand_color || '') ? p.brand_color : '#14b8a6';
    const s = window.state || {};
    const address = String(s.address || s.name || document.querySelector('#clientReport .address')?.textContent || 'Income-Producing Property').trim();
    return { company, person: person || company, contact, logo, accent, address };
  }

  function stateObj(){ return window.state || {}; }
  function resultObj(){ return window.result || {}; }
  function years(){
    const hold = Math.max(1, Math.round(num(stateObj().hold) || 1));
    return (resultObj().years || []).filter(y => num(y.year) >= 1 && num(y.year) <= hold).slice(0, hold);
  }
  function pointsAmort(y) {
    const s = stateObj(), r = resultObj();
    return s.loanYears && y.year <= s.loanYears ? num(r.pointCost) / num(s.loanYears) : 0;
  }
  function originationAmort(y) {
    const s = stateObj();
    return s.loanYears && y.year <= s.loanYears ? num(s.origFee) / num(s.loanYears) : 0;
  }
  function saleForYear(n) {
    const s = stateObj(), r = resultObj();
    const price = num(s.price);
    const grossSale = price * Math.pow(1 + num(s.appreciation), n);
    const selling = grossSale * num(s.sellCost);
    const netSale = grossSale - selling;
    const annualDep = num(r.depreciation);
    const depLife = Math.max(0, num(s.depLife) || 27.5);
    const accDep = Math.min(annualDep * n, annualDep * depLife);
    const book = price - accDep;
    const gain = netSale - book;
    const gainRate = n === 1 ? num(s.ordinaryTax) : num(s.capGainsTax);
    const taxesGain = gain * gainRate;
    const depTax = accDep * num(s.depTax);
    const saleTax = taxesGain + depTax;
    return { netSale, book, gain, gainRate, taxesGain, accDep, depTax, saleTax };
  }

  function row(label, vals, cls = '') {
    return `<tr class="${cls}"><td>${esc(label)}</td>${vals.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`;
  }
  function brandRows(title) {
    const b = branding();
    const logo = b.logo ? `<tr><td colspan="80"><img src="${esc(b.logo)}" style="max-height:52px;max-width:190px"></td></tr>` : '';
    return `<tr class="brand"><td colspan="80"><b>${esc(b.company)}</b></td></tr>${logo}<tr class="title"><td colspan="80"><b>${esc(title)}</b></td></tr><tr><td colspan="80">${esc(b.address)}</td></tr><tr><td colspan="80">Prepared by: ${esc(b.person)}</td></tr>${b.contact ? `<tr><td colspan="80">Contact: ${esc(b.contact)}</td></tr>` : ''}<tr><td colspan="80">PropertyThesis • Know the Numbers. Make the Offer.</td></tr><tr><td colspan="80"></td></tr>`;
  }
  function sheet(name, body) {
    const sheetName = esc(name.replace(/[\[\]:*?\/\\]/g, '').slice(0, 31));
    return `<div style='mso-element:worksheet;mso-element-name:"${sheetName}"'><table>${body}</table></div>`;
  }

  function afterTaxCashFlowSheet() {
    const ys = years();
    const heads = ys.map(y => 'Year ' + y.year);
    const rows = [
      row('After-Tax Cash Flow (ATCF)', heads, 'head'),
      row('Potential Gross Income', ys.map(y => money(y.pgi))),
      row('− Vacancy and Credit Losses', ys.map(y => money(y.vac))),
      row('= Effective Gross Income', ys.map(y => money(y.egi)), 'subtotal'),
      row('− Operating Expenses', ys.map(y => money(y.opex))),
      row('= Net Operating Income', ys.map(y => money(y.noi)), 'subtotal'),
      row('− Debt Service', ys.map(y => money(y.debt))),
      row('= Before-Tax Cash Flow', ys.map(y => money(num(y.noi) - num(y.debt))), 'subtotal'),
      row('− Taxes from Operations', ys.map(y => money(y.opTax))),
      row('= After-Tax Cash Flow', ys.map(y => money(y.atcf)), 'total')
    ];
    return sheet('After Tax Cash Flow', brandRows('Projected After-Tax Cash Flow') + rows.join(''));
  }
  function taxesFromOperationsSheet() {
    const ys = years();
    const heads = ys.map(y => 'Year ' + y.year);
    const rows = [
      row('Taxes From Operations', heads, 'head'),
      row('Net Operating Income', ys.map(y => money(y.noi))),
      row('− Interest', ys.map(y => money(y.interest))),
      row('− Depreciation', ys.map(() => money(resultObj().depreciation))),
      row('− Amortization of Points', ys.map(y => money(pointsAmort(y)))),
      row('− Amortization of Origination Fee', ys.map(y => money(originationAmort(y)))),
      row('= Taxable Income', ys.map(y => money(y.taxable)), 'subtotal'),
      row('× Ordinary Income Tax Rate', ys.map(() => pct(stateObj().ordinaryTax))),
      row('= Taxes from Operations', ys.map(y => money(y.opTax)), 'total')
    ];
    return sheet('Taxes From Operations', brandRows('Taxes From Operations') + rows.join(''));
  }
  function taxesDueOnSaleSheet() {
    const ys = years();
    const heads = ys.map(y => 'Year ' + y.year);
    const data = ys.map(y => saleForYear(num(y.year) || 1));
    const rows = [
      row('Taxes Due on Sale', heads, 'head'),
      row('Net Sales Price', data.map(d => money(d.netSale))),
      row('− Book Value', data.map(d => money(d.book))),
      row('= Gain (Loss) on Sale', data.map(d => money(d.gain)), 'subtotal'),
      row('× Applicable Gain Tax Rate', data.map(d => pct(d.gainRate))),
      row('= Taxes Due on Gain/Loss', data.map(d => money(d.taxesGain)), 'subtotal'),
      row('Accumulated Depreciation', data.map(d => money(d.accDep))),
      row('× Depreciation Tax Rate', data.map(() => pct(stateObj().depTax))),
      row('= Taxes Due on Depreciation', data.map(d => money(d.depTax)), 'subtotal'),
      row('Taxes Due on Sale', data.map(d => money(d.saleTax)), 'total')
    ];
    return sheet('Taxes Due on Sale', brandRows('Taxes Due on Sale') + rows.join(''));
  }

  function workbookHtml() {
    const b = branding();
    const accent = b.accent;
    const css = `<style>table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:10pt}td{border:1px solid #d9e2ec;padding:6px 8px;white-space:nowrap}.brand td,.brand{background:#173f66;color:#fff;font-size:15pt;border-bottom:4px solid ${accent}}.title td{background:#edf4fb;color:#173f66;font-size:13pt}tr.head td{background:#eaf4f6;font-weight:bold;color:#24465e}tr.subtotal td{background:#f3f8fc;font-weight:bold}tr.total td{background:#dff4ee;font-weight:bold;color:#064e3b}</style>`;
    const worksheets = `<xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>After Tax Cash Flow</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet><x:ExcelWorksheet><x:Name>Taxes From Operations</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet><x:ExcelWorksheet><x:Name>Taxes Due on Sale</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>`;
    return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">${worksheets}${css}</head><body>${afterTaxCashFlowSheet()}${taxesFromOperationsSheet()}${taxesDueOnSaleSheet()}</body></html>`;
  }

  function downloadExcel() {
    if (!years().length || !window.state || !window.result) {
      alert('Run the analysis before exporting the pro forma workbook.');
      return false;
    }
    const blob = new Blob([workbookHtml()], {type:'application/vnd.ms-excel;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = safeName((stateObj().address || stateObj().name || 'PropertyThesis') + ' Pro Forma') + '.xls';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return true;
  }

  function forceButton() {
    const controls = document.getElementById('rbControls');
    if (!controls) return false;
    const actions = controls.querySelector('.rb-export-panel .rb-actions') || controls.querySelector('.rb-actions') || controls;
    document.getElementById('rbExcelWorkbookExportFinal')?.remove();
    document.getElementById('rbProFormaJump')?.remove();
    let btn = document.getElementById('rbDownloadProForma');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'rbDownloadProForma';
      btn.type = 'button';
      btn.className = 'btn secondary';
      actions.appendChild(btn);
    }
    btn.disabled = false;
    btn.removeAttribute('aria-hidden');
    btn.textContent = 'Download Pro Forma';
    btn.style.display = '';
    btn.style.background = '#fff';
    btn.style.border = '1px solid #8eb5cf';
    btn.style.color = '#175f8e';
    btn.style.minWidth = '170px';
    btn.onclick = e => { e?.preventDefault?.(); e?.stopPropagation?.(); downloadExcel(); return false; };
    if (btn.parentElement !== actions) actions.appendChild(btn);
    return true;
  }

  function schedule() { [0, 60, 150, 300, 700, 1200, 2000].forEach(ms => setTimeout(forceButton, ms)); }
  function watch() {
    try { new MutationObserver(forceButton).observe(document.body, {childList:true, subtree:true}); } catch(e) {}
    let n = 0;
    const t = setInterval(() => { forceButton(); if (++n > 240) clearInterval(t); }, 125);
  }
  document.addEventListener('click', e => {
    const btn = e.target?.closest?.('#rbDownloadProForma');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    downloadExcel();
  }, true);
  window.PropertyThesisProFormaExcelFinal = {forceButton, downloadExcel, workbookHtml, years};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { schedule(); watch(); }, {once:true});
  else { schedule(); watch(); }
})();