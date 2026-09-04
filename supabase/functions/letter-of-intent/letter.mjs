// One server-rendered source of truth for the preview, saved record and email.
export const TEMPLATE_VERSION = 'discussion-loi-v1';
export const NONBINDING = 'This Letter of Intent is a preliminary expression of interest for discussion only. No provision is intended to be legally binding, and this is not a purchase contract or an offer capable of acceptance. Any transaction is subject to negotiation, legal review and execution of a separate definitive purchase agreement by all required parties. Neither party is obligated to proceed, negotiate, pay a deposit, reserve the property or incur expenses under this letter. No exclusivity, confidentiality or other binding obligation is proposed here.';
export function clean(value, label, max = 180, required = true) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${label} must be plain text on one line.`);
  const text = value.trim();
  if ((required && !text) || text.length > max) throw new Error(`${label} is required and must be at most ${max} characters.`);
  return text;
}
export function email(value) {
  const text = clean(value, 'Recipient email', 254).toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(text)) throw new Error('Enter one valid recipient email address.');
  return text;
}
function amount(value, label, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || Math.abs(value * 100 - Math.round(value * 100)) > 0.001) throw new Error(`${label} is outside the allowed range.`);
  return value;
}
export function validateTerms(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('LOI terms are required.');
  const role = clean(input.role, 'Sender role');
  if (!['Buyer / investor', 'Authorized buyer representative'].includes(role)) throw new Error('Choose your role.');
  const financing = clean(input.financing, 'Financing');
  if (!['Cash', 'Financing contingency', 'Seller financing to be negotiated'].includes(financing)) throw new Error('Choose a financing proposal.');
  const price = amount(input.price, 'Proposed price', 1, 1_000_000_000);
  const days = (v, label) => { const n = amount(v, label, 1, 365); if (!Number.isInteger(n)) throw new Error(`${label} must be a whole number.`); return n; };
  return {
    buyer: clean(input.buyer, 'Buyer / entity name'), sender: clean(input.sender, 'Sender name'), role,
    brokerage: clean(input.brokerage ?? '', 'Brokerage', 180, role === 'Authorized buyer representative'),
    recipientName: clean(input.recipientName, 'Recipient name'), recipientEmail: email(input.recipientEmail),
    price, deposit: amount(input.deposit, 'Proposed deposit', 0, price), financing,
    diligenceDays: days(input.diligenceDays, 'Due diligence period'), closingDays: days(input.closingDays, 'Closing timeframe'),
    test: input.test === true,
  };
}
export function completedAnalysis(analysis) {
  return !!analysis?.property_id && Number(analysis.assumptions?.price) > 0 && Number(analysis.assumptions?.rent) > 0 &&
    typeof analysis.outputs?.year1_noi === 'number' && Number.isFinite(analysis.outputs.year1_noi) &&
    typeof analysis.outputs?.irr === 'number' && Number.isFinite(analysis.outputs.irr);
}
export function renderLetter(terms, address, senderEmail, date) {
  const money = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  const subject = `${terms.test ? '[TEST — DO NOT ACT] ' : ''}Letter of Intent — ${address}`;
  const text = [
    ...(terms.test ? ['TEST EMAIL — FOR SOFTWARE TESTING ONLY. NOT A REAL PROPERTY PROPOSAL.', ''] : []),
    'PROPERTYTHESIS | LETTER OF INTENT', 'PRELIMINARY / NONBINDING DISCUSSION ONLY', '',
    `Prepared: ${date}`, `Property: ${address}`, `To: ${terms.recipientName}`, `Recipient email: ${terms.recipientEmail}`, '',
    NONBINDING, '',
    `${terms.buyer} would like to discuss a possible acquisition of the property identified above on the following proposed business terms:`, '',
    `Proposed purchase price: ${money(terms.price)}`,
    `Proposed earnest-money deposit: ${money(terms.deposit)} — payable only if and as provided in a future definitive agreement; no funds are due under this letter.`,
    `Proposed financing: ${terms.financing}. Any financing terms and conditions remain subject to a definitive agreement.`,
    `Proposed due diligence: ${terms.diligenceDays} calendar days after the effective date of a future definitive agreement.`,
    `Proposed closing target: ${terms.closingDays} calendar days after the effective date of a future definitive agreement.`,
    'Proposed conditions for discussion: satisfactory inspections, review of leases and income/expense records where applicable, acceptable title, and mutually agreed definitive documents. No inspection or access rights are granted by this letter.', '',
    'Please reply if you would like to discuss these preliminary terms. A reply, acknowledgment or email delivery does not constitute acceptance of a purchase contract.', '',
    `Sender: ${terms.sender}`, `Capacity: ${terms.role}`, `Proposed buyer / entity: ${terms.buyer}`,
    ...(terms.brokerage ? [`Brokerage identified by sender: ${terms.brokerage}`] : []),
    `Reply to: ${senderEmail}`, '',
    'No signature or acceptance is requested. Obtain independent legal advice before using this letter or negotiating definitive documents. The legal effect of a communication depends on its content and circumstances, not its title alone.', '',
    'Sent using PropertyThesis software at the direction of the identified sender. PropertyThesis and MELONI REALTY INC do not act as a broker or representative in this transaction merely by providing this software. Any representation must be established separately.',
    'No investment analysis, return targets, maximum supported price or other private underwriting is attached.',
  ].join('\n');
  const escaped = text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const html = `<div style="max-width:720px;margin:auto;padding:24px;color:#143347;font:16px/1.65 Arial,sans-serif"><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit">${escaped}</pre></div>`;
  return { subject, text, html };
}
export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
}
