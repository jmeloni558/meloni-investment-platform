# PropertyThesis End-to-End Reliability Checklist

Use this checklist before calling a release stable. Run it from top to bottom because later tests depend on earlier ones passing.

## How to record a test run

Copy the **Test Run Record** section for every release. Mark each test:

- `[x]` Pass
- `[ ]` Not tested
- `FAIL` Failed — include the defect number
- `BLOCKED` Could not test because an earlier step failed

For every failure, record the page URL, browser, account state, exact action, expected result, actual result, screenshot, console error if visible, and approximate time.

### Severity

- **P0 — Release blocker:** security issue, data loss, incorrect payment, inaccessible site, or another user's data is visible.
- **P1 — Critical workflow:** signup, sign-in, calculate, save, checkout, report, or navigation cannot be completed.
- **P2 — Important defect:** workflow completes but contains confusing state, wrong messaging, stale data, or a significant layout problem.
- **P3 — Cosmetic:** visual inconsistency that does not interfere with use.

## Test Run Record

- Date and time:
- Tester:
- Release commit:
- GitHub Pages deployment completed at:
- Live URL tested: `https://propertythesis.com/`
- Desktop browser and version:
- Mobile device/browser:
- Stripe mode: Sandbox / Live
- RentCast mode or limits:
- Guest state: fresh incognito window
- Existing free-account email:
- New-account email:
- Paid sandbox-account email:
- Result: PASS / FAIL / BLOCKED
- Open P0/P1 defects:

---

## 1. Deployment and clean-session smoke test

- [ ] **1.1** Confirm the intended GitHub Actions deployment completed successfully for the expected commit.
- [ ] **1.2** Open `https://propertythesis.com/` directly in a new incognito/private window—not from a bookmark.
- [ ] **1.3** Confirm the canonical URL does not contain `/latest`, an old cache-busting query, or an unexpected page name.
- [ ] **1.4** Refresh with F5. The page remains at the top and does not jump down and back up.
- [ ] **1.5** Hard-refresh once. The same current design loads.
- [ ] **1.6** Confirm there is no unexpected sign-in modal, “Leave site?” warning, loading overlay, or browser console error.
- [ ] **1.7** Confirm the logo is sharp, blends into the header, and reads “Know the Numbers. Prove the Case.”
- [ ] **1.8** Click the header logo from the home page. It reloads/returns to the top without visible scrolling.
- [ ] **1.9** Resize the window from desktop width to narrow/mobile width. No controls disappear, overlap, or become unreachable.

**Stop the run for:** wrong deployment, blank page, stale site, automatic scrolling, or unsolicited modal.

## 2. Logged-out home page and public navigation

- [ ] **2.1** Confirm the logged-out toolbar contains the intended public links with no duplicates.
- [ ] **2.2** Confirm “Start Free Analysis” moves directly to the first-entry area and nowhere else.
- [ ] **2.3** Test every “Start Free Analysis” call to action. All land at the same first-entry area.
- [ ] **2.4** Open Search Listings. It opens as its own page/view inside the PropertyThesis wrapper and begins at the top.
- [ ] **2.5** Open Sample Report. It remains inside the wrapper and offers the sample report and sample pro forma, without the removed sample-analysis link.
- [ ] **2.6** Open Sample Property Card. It remains inside the wrapper; rent and desired cap rate are editable; no live listing search is offered.
- [ ] **2.7** Open Pricing. Header, logo, toolbar alignment, wrapper, and footer match the rest of the public site.
- [ ] **2.8** Open Mortgage Tools. A consistent sign-in experience is shown because an account is required, and no payment is requested.
- [ ] **2.9** Open Glossary. All calculator-input sections and metric definitions are reachable.
- [ ] **2.10** Use the header logo from each public page. Every click returns directly to the top of the home page without scroll movement.
- [ ] **2.11** Use browser Back and Forward through all public pages. State and layout remain correct.
- [ ] **2.12** Confirm the footer displays the current tagline, contact information, brokerage disclosure, and legal links consistently.

## 3. Guest listing search

- [ ] **3.1** Start in a new incognito window with no session.
- [ ] **3.2** Search by city and state using a known active market.
- [ ] **3.3** Search by ZIP code.
- [ ] **3.4** Search by starting address and radius.
- [ ] **3.5** Confirm blank fields contain no misleading default values.
- [ ] **3.6** Confirm 2–4 unit multifamily and 5+ unit apartments are selected initially.
- [ ] **3.7** Add and remove other property types; results respect the selection as closely as the source data permits.
- [ ] **3.8** Test minimum/maximum price, bedrooms, bathrooms, square footage, year built, days listed, listing type, pool, garage, and investment filters that are currently exposed.
- [ ] **3.9** Enter an invalid range, such as minimum price greater than maximum price. A clear validation message appears and no API call is wasted.
- [ ] **3.10** Confirm the loading state appears once and the Search button cannot trigger duplicate simultaneous searches.
- [ ] **3.11** Confirm results show the number loaded and do not silently return stale results from a previous query.
- [ ] **3.12** Confirm Street View images load or show a controlled fallback—never a broken-image icon.
- [ ] **3.13** Repeat the identical search. Cached-result messaging and allowance messaging are accurate.
- [ ] **3.14** Open a listing and confirm its modal is in front of the page and can scroll, expand, collapse, and close.
- [ ] **3.15** Confirm listing price, address, units, square feet, year built, days on market, bedrooms, bathrooms, lot size, listing type and listing number display when data exists.
- [ ] **3.16** Confirm unavailable fields say “Unavailable” rather than displaying invented values.
- [ ] **3.17** Confirm guest-only restrictions clearly say that a free account is required and provide working Create Account and Sign In actions.
- [ ] **3.18** Open Create Account from inside the property card. The account modal appears above the listing modal.
- [ ] **3.19** Open Sign In from inside the property card. The sign-in modal appears above the listing modal.
- [ ] **3.20** Close the account/sign-in modal. The listing card and its entered values remain intact.

## 4. Property-card screening calculations

Use this known-answer test:

- Asking price: **$500,000**
- Monthly gross rent: **$4,000**
- Vacancy: **10%**
- Operating expenses: **40% of effective gross income**

Expected results:

- Annual gross rent: **$48,000**
- Effective gross income: **$43,200**
- Operating expenses: **$17,280**
- NOI: **$25,920**
- Cap rate at asking price: **5.18%** after display rounding
- Value at 5.00% cap: **$518,400**
- Value at 5.50% cap: approximately **$471,273**
- Value at 6.00% cap: **$432,000**
- Value at 6.50% cap: approximately **$398,769**
- Value at 7.00% cap: approximately **$370,286**
- Value at a user-entered 6.25% cap: **$414,720**

- [ ] **4.1** Enter $4,000 rent and confirm every expected number above.
- [ ] **4.2** Confirm the rent field is visually obvious and clearly labeled editable.
- [ ] **4.3** Change rent to $4,500. All dependent results update once, immediately, without reopening the card.
- [ ] **4.4** Enter a desired cap rate of 6.25%. Confirm the supported value is $414,720 using the original known-answer rent.
- [ ] **4.5** Test blank, zero, negative, alphabetic and unusually large rent/cap-rate values. The UI rejects or safely explains invalid input.
- [ ] **4.6** Confirm the 10% vacancy and 40% operating-expense assumptions are visible near the results.
- [ ] **4.7** Confirm no result is presented as an appraisal, guaranteed value or brokerage recommendation.
- [ ] **4.8** Click Analyze This Property. Address, price, rent and available property facts carry into the guided analysis exactly once.

## 5. Free-analysis entry and seven-step workflow

- [ ] **5.1** Begin logged out from the home-page entry form.
- [ ] **5.2** Confirm address is optional and price/rent are required.
- [ ] **5.3** Click into the address field and type continuously. Focus and cursor position are never lost.
- [ ] **5.4** Select an address suggestion. The selected address is not replaced or cleared unexpectedly.
- [ ] **5.5** Enter price and rent; begin the analysis. No account is required yet.
- [ ] **5.6** Confirm the analysis opens at Step 1 with the carried data and visible default assumptions.
- [ ] **5.7** Move forward and backward through every step. Entered values persist.
- [ ] **5.8** Confirm each step distinguishes user-entered values, sourced values and PropertyThesis defaults.
- [ ] **5.9** Test numeric fields with commas, currency symbols, decimals, zero, negative input and empty values as applicable.
- [ ] **5.10** Confirm validation points to the exact field needing correction and preserves all other entries.
- [ ] **5.11** Confirm Step 7 always shows one clear Calculate, Save & Review Results action.
- [ ] **5.12** Refresh on an intermediate step. The page does not jump, duplicate sections, or silently lose the analysis.
- [ ] **5.13** Attempt to close/navigate away after making a real change. The warning appears only when data would actually be lost.
- [ ] **5.14** Save or finish the relevant action, then navigate/refresh. No false “Leave site?” warning appears.

## 6. New-account creation and email verification

Use a genuinely unused test address, or delete the designated test user and its related test data before beginning.

- [ ] **6.1** From Step 7, click Calculate, Save & Review Results while logged out.
- [ ] **6.2** Confirm only the focused Create Free Account workflow is emphasized; existing-user Sign In is a separate secondary link.
- [ ] **6.3** Enter mismatched passwords. A clear inline error appears and no signup request is sent.
- [ ] **6.4** Enter a password shorter than the stated minimum. A clear inline error appears.
- [ ] **6.5** Complete Cloudflare Turnstile once. The Create Account button cannot submit duplicate requests.
- [ ] **6.6** Confirm “Creating account” ends within the expected timeout and never remains indefinitely.
- [ ] **6.7** Confirm the verification instructions identify the correct email and explicitly say not to reset the password.
- [ ] **6.8** Confirm only one registration notification is sent to the PropertyThesis administrator.
- [ ] **6.9** Test Resend Verification Email once. It produces clear feedback and does not create another user.

### Same-device confirmation

- [ ] **6.10** Open the confirmation email on the same computer.
- [ ] **6.11** Choose the supported “continue in prior tab” path.
- [ ] **6.12** Confirm the original analysis tab detects verification, signs the user in, returns to Step 7, and restores every entered value.
- [ ] **6.13** Calculate once. Results display and the first analysis saves automatically as Base Case without asking for a name.
- [ ] **6.14** Confirm only one verified-user notification is sent to the administrator.

### Different-device confirmation

- [ ] **6.15** Repeat with another new test account and open the confirmation email on a phone.
- [ ] **6.16** On the original computer, use “I confirmed on another device.”
- [ ] **6.17** Confirm verification is detected, the user signs in, all analysis data is restored, and Step 7 is ready to calculate.
- [ ] **6.18** Confirm unsupported “start in a new blank tab” behavior is not offered.

**Stop the run for:** account created twice, endless Turnstile, missing analysis, blank callback tab, failure to sign in after verification, or duplicate property.

## 7. Existing-user authentication

- [ ] **7.1** Sign out. The correct logged-out home page renders immediately without requiring refresh.
- [ ] **7.2** Refresh while logged out. No sign-in modal appears automatically.
- [ ] **7.3** Open Sign In from the public toolbar. The standard site-wide sign-in modal appears inside the wrapper.
- [ ] **7.4** Confirm email and password fields use standard autocomplete attributes and remain usable with password managers.
- [ ] **7.5** Enter an incorrect password. A helpful error appears without clearing the email unnecessarily.
- [ ] **7.6** Sign in successfully. The app opens Existing Properties immediately, without briefly mixing logged-in and logged-out toolbars.
- [ ] **7.7** Refresh while logged in. The session persists and the same account data loads once.
- [ ] **7.8** Open the site in a second tab. Authentication state and navigation are consistent.
- [ ] **7.9** Test Forgot Password. The email, reset link, new password and subsequent sign-in all work.
- [ ] **7.10** Sign out from the second tab and refresh the first. Private account data is no longer accessible.

## 8. Saved-property and analysis lifecycle

- [ ] **8.1** Confirm Existing Properties shows each property exactly once.
- [ ] **8.2** Confirm every property card uses the same buttons and layout appropriate to its state.
- [ ] **8.3** Confirm price, value conclusion, IRR, DSCR, rent, cap rate, NPV, latest analysis, quality and updated time agree with the saved analysis.
- [ ] **8.4** Open a property. All property and latest-analysis data hydrate correctly.
- [ ] **8.5** Edit the guided analysis, save it, leave the page, return, and confirm the changes persist.
- [ ] **8.6** Start a new analysis for an existing property. Only this second analysis asks for a distinct scenario name.
- [ ] **8.7** Attempt to reuse an existing scenario name. The system handles it predictably without overwriting silently.
- [ ] **8.8** Open Manage Analyses and switch between versions. Each version shows its own assumptions and outputs.
- [ ] **8.9** Archive a property and confirm it disappears from active results and appears when Show Archived is selected.
- [ ] **8.10** Restore an archived property and confirm its analyses remain attached.
- [ ] **8.11** Delete only a disposable test property. Confirm the exact property and related test analyses are removed and no other records change.
- [ ] **8.12** Use Refresh. Counts and cards update without duplicated controls or incorrect promotional banners.

## 9. Calculation and results regression

- [ ] **9.1** Run the known-answer property from Section 4 through the full calculator.
- [ ] **9.2** Confirm PGI, vacancy, EGI, operating expenses, NOI and cap rate reconcile arithmetically.
- [ ] **9.3** Confirm loan amount, monthly payment, annual debt service and amortization reconcile with the financing inputs.
- [ ] **9.4** Confirm DSCR equals NOI divided by annual debt service.
- [ ] **9.5** Confirm cash flow equals NOI less debt service and any separately identified non-operating items.
- [ ] **9.6** Confirm cash-on-cash return uses the displayed annual cash flow and displayed cash invested.
- [ ] **9.7** Confirm NPV and IRR respond correctly when holding period, sale price/appreciation, sale costs or discount rate changes.
- [ ] **9.8** Confirm holding periods of 1 year, 7 years and 40 years calculate without cutoff, missing years or stale prior results.
- [ ] **9.9** Confirm income-supported value and desired-cap value use the same NOI shown elsewhere.
- [ ] **9.10** Confirm summary, detailed results, saved property card, PDF and pro forma all show the same key numbers.
- [ ] **9.11** Run the repository’s automated calculation/regression checks and attach their result to the test run.

## 10. Professional report and pro forma

- [ ] **10.1** Generate a logged-in professional report and record the generation time. Target: under 10 seconds under normal conditions.
- [ ] **10.2** Confirm the report is fully visible on screen and is not clipped horizontally or vertically.
- [ ] **10.3** Confirm logo, current tagline, user branding and broker information are correct.
- [ ] **10.4** Confirm address, acquisition price, rent, financing, valuation conclusion and return metrics match the saved analysis.
- [ ] **10.5** Confirm assumptions, formulas, risks and data-source limitations are readable.
- [ ] **10.6** Print/Save as PDF. Inspect the first, middle and last pages for clipping, blank pages and broken page breaks.
- [ ] **10.7** Download the multiyear Excel pro forma. It opens without repair warnings.
- [ ] **10.8** Confirm the workbook uses the selected holding period rather than always using seven years.
- [ ] **10.9** Confirm workbook totals and the report’s headline results reconcile.
- [ ] **10.10** Open the logged-out Sample Report and Sample Pro Forma. Both remain inside the site wrapper and contain generic—not user—data.

## 11. Pricing, paywall and Stripe sandbox

- [ ] **11.1** Confirm the public Pricing page shows the intended free analysis, $15 single property, Professional 50, and Unlimited choices with correct monthly/yearly prices.
- [ ] **11.2** Confirm a free user can revise the originally unlocked property without being charged again, according to the intended entitlement rules.
- [ ] **11.3** Begin another paid analysis and confirm every route to calculation is protected by the same paywall.
- [ ] **11.4** Confirm there is no secondary calculate/view-results button that bypasses payment.
- [ ] **11.5** Open each plan from every promotional banner. Every button reaches the same correct pricing/checkout flow.
- [ ] **11.6** Before Stripe navigation, confirm analysis state is saved; no inappropriate “Leave site?” warning appears.
- [ ] **11.7** Verify the Stripe page clearly says Sandbox while testing.
- [ ] **11.8** Complete a successful $15 sandbox checkout with Stripe test data.
- [ ] **11.9** Return to PropertyThesis. The correct property unlocks once and the analysis can calculate/save.
- [ ] **11.10** Refresh and sign in again. The entitlement remains.
- [ ] **11.11** Complete a Professional 50 sandbox subscription and confirm the plan is reflected in the account.
- [ ] **11.12** Confirm the free-user upgrade banner disappears for a paid subscriber across all logged-in pages.
- [ ] **11.13** Confirm subscriber toolbar links remain correct on Pricing, Mortgage Tools, Glossary and analysis pages.
- [ ] **11.14** Test canceled checkout. The user returns safely with analysis data preserved and no entitlement granted.
- [ ] **11.15** Test a declined Stripe card. A helpful Stripe error appears and no entitlement is granted.
- [ ] **11.16** Confirm Stripe webhook processing does not grant the same entitlement twice.

## 12. Plan limits and listing allowances

- [ ] **12.1** Confirm guest, free, Professional 50, Unlimited and designated tester accounts receive the intended listing-search allowances.
- [ ] **12.2** Confirm cached searches do not consume another paid API call when policy says they should not.
- [ ] **12.3** Confirm a blocked search explains the limit, reset timing and upgrade option without showing a raw Edge Function error.
- [ ] **12.4** Confirm paid subscribers have ample search access and do not see free-account warning copy.
- [ ] **12.5** Confirm opening one result does not trigger unplanned calls for every result.
- [ ] **12.6** Confirm rent-estimate calls remain removed where intentionally disabled.
- [ ] **12.7** Confirm the tester bypass applies only to designated accounts and cannot be claimed by changing browser-side data.

## 13. Logged-in supporting pages

- [ ] **13.1** From a logged-in page, open Mortgage Tools. It loads once inside the wrapper with no duplicate header or public toolbar.
- [ ] **13.2** Exercise each mortgage calculator with a known simple example and confirm results update.
- [ ] **13.3** Open Search Properties/Listings and confirm the account’s correct allowance and saved state.
- [ ] **13.4** Open Search Clients, assign a test client, save, refresh and confirm the association persists.
- [ ] **13.5** Open Profile & Branding, update a harmless test field, save, refresh and confirm persistence.
- [ ] **13.6** Confirm Pricing recognizes the logged-in account and displays the logged-in toolbar.
- [ ] **13.7** Confirm Glossary is accessible without losing the session.
- [ ] **13.8** Confirm Sample Property Card appears for guests/free users and is absent from the toolbar for an active subscriber, as intended.

## 14. Security and privacy checks

- [ ] **14.1** While logged out, directly open a copied URL for a saved analysis/property. Private data is not displayed.
- [ ] **14.2** Sign in as Test User A and copy a protected resource identifier. Sign in as Test User B and confirm B cannot retrieve A’s property, analysis, client, report or billing data.
- [ ] **14.3** Confirm service-role keys, Stripe secret keys, Resend keys, webhook secrets and unrestricted server API keys are absent from page source and repository files.
- [ ] **14.4** Confirm public browser API keys are restricted by domain and API as appropriate.
- [ ] **14.5** Confirm authentication and payment errors do not reveal stack traces, SQL, tokens or internal secrets.
- [ ] **14.6** Confirm deleted/archived records behave according to the stated product policy.
- [ ] **14.7** Confirm report disclaimers, brokerage disclosure, privacy link and terms link are present where required.

**Any failure in 14.1–14.5 is P0. Stop testing and do not launch.**

## 15. Mobile and accessibility pass

Run at minimum on a real phone and at desktop widths around 1440, 1024, 768 and 390 pixels.

- [ ] **15.1** Toolbar is usable without overlapping, clipping or tiny tap targets.
- [ ] **15.2** Forms keep the active field visible when the mobile keyboard opens.
- [ ] **15.3** Address suggestions are selectable by touch.
- [ ] **15.4** Listing/property-card modal fits the viewport, scrolls correctly and can always be closed.
- [ ] **15.5** Auth modal remains above every other modal and can always be closed.
- [ ] **15.6** Seven-step workflow can be completed without horizontal scrolling.
- [ ] **15.7** Results tables/charts remain readable or provide an intentional scroll treatment.
- [ ] **15.8** Buttons and links have visible keyboard focus on desktop.
- [ ] **15.9** Forms can be completed using Tab and Shift+Tab in a sensible order.
- [ ] **15.10** Required fields, errors and statuses are not communicated by color alone.
- [ ] **15.11** Zoom to 200%. Core actions and text remain usable.
- [ ] **15.12** Images have appropriate alternative text and decorative images do not create noise.

## 16. Final release gate

- [ ] All P0 and P1 tests pass.
- [ ] No unresolved data-loss, privacy, payment or calculation defects exist.
- [ ] All known P2/P3 defects are documented with an explicit decision to defer them.
- [ ] The deployed commit matches the approved release commit.
- [ ] The live-site smoke test passes in a fresh incognito window after deployment.
- [ ] One full guest-to-verified-user-to-saved-report workflow passes on desktop.
- [ ] One full existing-user-to-paid-sandbox-checkout workflow passes.
- [ ] One mobile guest search-to-property-card-to-account prompt workflow passes.
- [ ] Calculation known-answer checks pass in the property card, results, PDF and pro forma.

---

## Defect report template

### PT-____ — Short title

- Severity: P0 / P1 / P2 / P3
- Release commit:
- Date/time and timezone:
- Browser/device:
- Account state: Guest / Unverified / Free / Professional 50 / Unlimited / Tester
- Stripe mode: Sandbox / Live / Not applicable
- Starting URL:
- Preconditions:
- Steps to reproduce:
  1.
  2.
  3.
- Expected result:
- Actual result:
- Reproduces in incognito: Yes / No / Not tested
- Reproduces after one refresh: Yes / No / Not tested
- Screenshot/video:
- Console or network error:
- Data at risk:
- Workaround, if any:

## Suggested routine

- **After every deployment:** Sections 1–2 plus the specific changed workflow.
- **Before merging or releasing authentication changes:** Sections 1, 5–8 and 14.
- **Before billing changes:** Sections 1, 7, 8, 11, 12 and 14.
- **Before calculator/report changes:** Sections 4, 5, 8–10.
- **Before a public launch:** Run all sections on desktop and the mobile/accessibility pass.
