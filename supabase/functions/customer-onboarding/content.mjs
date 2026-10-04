// Versioned onboarding copy shared by previews, tests and the sender.
export const CAMPAIGN_VERSION = 'welcome-tips-v1';
export const SITE = 'https://propertythesis.com/';
export const SUPPORT = 'jamie@propertythesis.com';
export const lessons = [
  {
    subject: 'Welcome to PropertyThesis â€” build your first analysis',
    heading: 'Know the Numbers. Make the Offer.',
    paragraphs: [
      'Welcome to PropertyThesis! Your account is ready. Start with one property and work through the assumptions before deciding whether a deal deserves a closer look.',
      '1. Sign in at propertythesis.com using the email and password you used to create your account.',
      '2. Start an analysis and enter the property address, purchase price, rental income and operating expenses. Review any suggested information against your own research.',
      '3. Enter your financing terms and holding period. Check the cash flow, returns and exit assumptions; change the inputs to see how the results respond.',
      '4. Save the analysis when you want to return to it. Available saves and features depend on your plan. Recalculate after changing assumptions so the results reflect your latest inputs.',
      '5. Preview the report, review its assumptions and export a PDF where your plan provides that feature. Keep your original scenario so you can compare alternatives.',
    ],
    action: 'Start your first analysis',
  },
  {
    subject: 'PropertyThesis tip 1: Start with inputs you can explain',
    heading: 'Build a dependable starting case',
    paragraphs: [
      'Before focusing on a return percentage, make sure the starting assumptions describe the property you are actually considering.',
      'Review the purchase price, number of units, rent per unit, vacancy and operating expenses. Check the units on each field: a monthly amount, annual amount and percentage are not interchangeable.',
      'Suggested rents and property details are a starting point, not a substitute for leases, tax records, insurance quotes and your own research.',
      'Try this: open one saved analysis, review the income and expense inputs, then recalculate. Save only when you intend to replace the saved assumptions.',
    ],
    action: 'Review an analysis',
  },
  {
    subject: 'PropertyThesis tip 2: Look beyond the headline return',
    heading: 'Read cash flow alongside returns',
    paragraphs: [
      'A deal can show an attractive projected return and still need cash along the way. Review the timing of income, operating costs, debt payments and sale proceeds together.',
      'Compare annual cash flow with net operating income. Financing affects cash flow, while net operating income describes property operations before debt service.',
      'Review the holding-period schedule as well as year one. Later-year growth assumptions can change the story considerably.',
      'Try this: lower rent or increase vacancy in a separate scenario, recalculate, and check how much cash you would need to keep the property operating.',
    ],
    action: 'Review cash flow',
  },
  {
    subject: 'PropertyThesis tip 3: Match the model to the loan',
    heading: 'Check financing through the sale date',
    paragraphs: [
      'Loan amount, interest rate, amortization and maturity describe different parts of a financing arrangement. Match each field to the actual proposed loan terms.',
      'An interest-only payment does not pay down principal. Review the remaining balance and any balloon payment, especially when the loan matures before your planned sale.',
      'A projected sale does not automatically solve a maturity gap. Consider how you would fund or refinance a balance due earlier.',
      'Try this: compare two financing scenarios with the same operating assumptions. Review debt payments, cash flow and the balance due at exit before comparing returns.',
    ],
    action: 'Review financing assumptions',
  },
  {
    subject: 'PropertyThesis tip 4: Compare a base case and a downside case',
    heading: 'Find the assumptions that matter most',
    paragraphs: [
      'A useful analysis shows what happens when the deal does not follow your preferred path.',
      'Keep a clearly named base case. Where scenarios are available, create a downside case and change one assumption at a time: rent, vacancy, expenses, financing or the sale assumption.',
      'Compare both annual cash flow and sale proceeds. A result that depends heavily on future appreciation deserves a different conversation from one supported by ongoing income.',
      'Try this: keep rent growth at zero in one scenario, recalculate, then compare it with your base case. This is a sensitivity check, not a forecast.',
    ],
    action: 'Compare your assumptions',
  },
  {
    subject: 'PropertyThesis tip 5: Review the report before sharing it',
    heading: 'Make your report easy to follow',
    paragraphs: [
      'A report is most useful when another reader can understand the assumptions behind the results.',
      'Before exporting, check the property, analysis name, holding period, financing terms and any author or company details. Recalculate first if you have changed inputs.',
      'Preview the narrative and financial schedule. If PDF or Excel export is included in your plan, open the downloaded file and make sure it is the version you intended to share.',
      'Try this: export one report and read it as if you had never seen the property. Note any assumption you would want explained before making a decision.',
    ],
    action: 'Prepare a report',
  },
  {
    subject: 'PropertyThesis tip 6: Refresh the analysis before making an offer',
    heading: 'Keep the decision tied to current information',
    paragraphs: [
      'Your saved analysis is a working record. New rent information, an insurance quote or a revised purchase price can change the outcome.',
      'Reopen the property, update the assumptions you can support, and recalculate. Review the report again before saving and sharing the updated version.',
      'When using the Android app, sign in with the same PropertyThesis account as the website. Save deliberately and check which analysis or scenario you are opening on each device.',
      'Try this: write down your main unanswered question about the deal, then identify the input or source you need to resolve it.',
      'This is the last lesson in your six-week getting-started series. Need help with the website? Reply to this email and tell us where you are getting stuck.',
    ],
    action: 'Revisit a property',
  },
];

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderEmail(step, { unsubscribeUrl, appDownloadUrl = '', tips = false } = {}) {
  if (!Number.isInteger(step) || !lessons[step]) throw Error('Invalid campaign step');
  const unsub = new URL(unsubscribeUrl);
  if (unsub.protocol !== 'https:') throw Error('HTTPS unsubscribe URL required');
  // Never accidentally advertise an internal-test link to all new customers.
  if (appDownloadUrl && !/^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.propertythesis\.app$/.test(appDownloadUrl)) throw Error('Public app listing required');
  const lesson = lessons[step];
  const paragraphs = [...lesson.paragraphs];
  if (step === 0) {
    paragraphs.push(appDownloadUrl
      ? 'Use PropertyThesis on Android: open the Google Play link below on your phone, install PropertyThesis, then sign in with the same PropertyThesis email and password as the website. Your Google Play account and PropertyThesis account are separate.'
      : 'Android access: the app is currently in early testing. Reply to this email to request access and include the Google account email you use in the Play Store. After access is enabled, we will send installation instructions. Use the same PropertyThesis account on the phone and website. There is not yet a public iOS app; you can use the website in your phone browser.');
    paragraphs.push(tips ? 'You also chose weekly website tips. Your first lesson arrives in about seven days, followed by one lesson each week for six weeks. You can unsubscribe below at any time.' : 'This welcome email helps you get started. You have not been enrolled in the weekly tips series.');
  }
  const footer = 'PropertyThesis â€¢ MELONI REALTY INC â€¢ 18012 Loretta Lane, Lutz, FL 33548';
  const note = 'PropertyThesis models your assumptions; results are estimates, not guarantees. Verify inputs and consult your own advisers when needed.';
  const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>${escape(lesson.subject)}</title></head><body style="margin:0;background:#f1f5f7;color:#173447;font-family:Arial,sans-serif"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:24px 12px"><table role="presentation" style="max-width:600px;width:100%;margin:auto;background:white;border-collapse:collapse"><tr><td style="padding:28px;background:#173d50;color:white;font-size:25px;font-weight:bold">PropertyThesis</td></tr><tr><td style="padding:28px;font-size:16px;line-height:1.65"><h1 style="font-size:25px;line-height:1.3">${escape(lesson.heading)}</h1>${paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}<p><a style="display:inline-block;background:#118675;color:white;padding:12px 20px;text-decoration:none;border-radius:6px" href="${SITE}">${escape(lesson.action)}</a></p>${step===0&&appDownloadUrl?`<p><a href="${escape(appDownloadUrl)}">Download PropertyThesis on Google Play</a></p>`:''}<p>Questions? Reply to this email or contact <a href="mailto:${SUPPORT}">${SUPPORT}</a>.</p><p style="font-size:13px;color:#536570">${note}</p><hr style="border:0;border-top:1px solid #dce5e9"><p style="font-size:12px;color:#536570">${footer}<br><a href="${escape(unsubscribeUrl)}">Unsubscribe from welcome and website-tip emails</a><br>Account security and essential service emails are separate.</p></td></tr></table></td></tr></table></body></html>`;
  return { subject: lesson.subject, html, text: [lesson.heading,...paragraphs,`${lesson.action}: ${SITE}`,step===0?appDownloadUrl:'',`Questions? ${SUPPORT}`,note,footer,`Unsubscribe: ${unsubscribeUrl}`].filter(Boolean).join('\n\n') };
}
