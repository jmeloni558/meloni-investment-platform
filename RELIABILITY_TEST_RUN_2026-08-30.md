# PropertyThesis Reliability Test Run — 2026-08-30

## Run information

- Tester: Jamie Meloni, guided by Codex
- Live URL: `https://propertythesis.com/`
- Branch: `main`
- Deployed commit: `627f555`
- Full local commit observed: `627f5552c3c156805a461638d1a58ec527847867`
- Deployment status: Success
- Browser: Microsoft Edge InPrivate
- Session state: Signed in as `jrmeloni@hotmail.com`
- Status: In progress
- Next test: **Section 9 PDF confirmation and disposable-property cleanup**

## Status legend

- PASS — expected behavior observed
- FAIL — defect recorded
- PARTIAL — core outcome succeeded but a defect was observed
- NOT RUN — not yet tested

## Section 1 — Deployment and clean-session smoke test

| Test | Result | Notes |
|---|---|---|
| 1.1 Deployment matches expected commit | PASS | GitHub Pages build and deployment succeeded for `c708dbe`. Node.js deprecation annotation was non-blocking. |
| 1.2 Open canonical site in clean InPrivate session | PASS | Opened at top with no popup or warning. |
| 1.3 Canonical URL | PASS | URL remained `https://propertythesis.com`; no `/latest` or stale query string. |
| 1.4 Normal F5 refresh | PASS | Stayed at top with no jump, modal, or leave-site warning. |
| 1.5 Hard refresh | PASS | Stayed at top; no popup or warning; URL remained canonical. |
| 1.6 Hidden browser errors | FAIL | Three red console errors and multiple warnings; see PT-002 and PT-003. |
| 1.7 Header logo quality | PARTIAL | Readable and blended, but visibly soft; see PT-004. |
| 1.8 Header logo navigation from homepage | FAIL | Brief scroll down and back up before ending at top; see PT-005. |
| 1.9 Responsive resizing | PASS | No overlap, clipping, inaccessible controls, or stuck narrow layout observed. |

## Section 2 — Logged-out home page and public navigation

| Test | Result | Notes |
|---|---|---|
| 2.1 Public toolbar contents | PASS | Eight intended public links appeared once, in the correct order, with no logged-in links. |
| 2.2 Toolbar Start Free Analysis | FAIL | Opened Step 1 of 7 rather than the simplified homepage form and displayed an account-style toolbar; see PT-006 and PT-007. |
| 2.3 All Start Free Analysis calls to action | FAIL | Toolbar, hero, and bottom calls to action all opened Step 1 of 7 and displayed the incorrect toolbar; see PT-006 and PT-007. |
| 2.4 Search Listings public page | PASS | Dedicated page inside wrapper; opened at top with correct public toolbar and no unsolicited login. |
| 2.5 Sample Report content | PASS | Report displayed inside wrapper with Sample Pro Forma and Print/Save as PDF; no Sample Analysis control or user data. |
| 2.6 Sample Property Card | PASS | Page remained in wrapper; rent and desired cap were editable; no live search or unsolicited login. |
| 2.7 Pricing content | PASS | Header, wrapper, prices, footer, and initial public toolbar presentation passed. A separate current-page toolbar issue was found in 2.10E. |
| 2.8 Mortgage Tools guest gate | PASS | Consistent sign-in modal opened in front; account creation was separate; no payment required. |
| 2.9 Glossary | PASS | Sections, jump links, definitions, wrapper, and public access passed. |
| 2.10 Header logo from public pages | PARTIAL | Glossary passed. Search Listings, Sample Report, Sample Property Card, and intermittently Pricing showed the scroll jump. Toolbar inconsistencies found on Sample Report and Pricing. |
| 2.11 Browser Back/Forward | PASS | All pages restored correctly, apart from already-recorded toolbar issues. |
| 2.12 Footer consistency and disclosures | PASS | Homepage and Pricing footer matched and used the current tagline and intended disclosures. |

## Section 3 — Guest listing search

| Test | Result | Notes |
|---|---|---|
| 3.1 Fresh guest session | PASS | Testing used a clean Edge InPrivate session. |
| 3.2 Search by city and state | PASS | Tampa, FL returned 18 of 70 matching listings after about 8–10 seconds. All sampled addresses were in Tampa, Florida. Temporary unrestricted-testing notice was accurate. |
| 3.3 Search by ZIP code | PASS | ZIP 33602 returned 3 of 3 listings; all three displayed 33602 addresses. |
| 3.4 Search by starting address and radius | PASS | A 5-mile search from 100 N Tampa St returned 18 of 37 matches. Search took about 20 seconds. |
| 3.5 Blank fields contain no misleading defaults | PASS | User-entered fields were blank. Intentional selectors retained defaults such as 10-mile radius and newest sort. |
| 3.6 Initial multifamily property types | PASS | 2–4 unit multifamily and 5+ unit apartment were checked initially; other property types were unchecked. |
| 3.7 Add/remove property types | PASS | Single-family-only Tampa search returned 18 visible results, all labeled Single Family. |
| 3.8 Property and listing filters | PASS | Combined price, bedroom, bathroom, square-footage, year-built, recency and Standard listing filters returned 17 results. Visible prices, sizes, years and days complied. Price-low-to-high sorting was mathematically correct. Pool/garage were not exposed as search filters in this build. |
| 3.9 Invalid range validation | FAIL | Minimum price $500,000 with maximum price $300,000 called the Edge Function and showed raw “Edge Function returned a non-2xx status code”; see PT-010. |
| 3.10 Loading and duplicate-submit protection | PARTIAL | “Searching active listings…” appeared, but Search Listings remained enabled during the request; see PT-011. No deliberate duplicate call was sent. |
| 3.11 Result count and stale results | PASS | Final status count matched the rendered card count. Changed searches replaced the result set; no silent stale result was observed. |
| 3.12 Street View/fallback behavior | PASS | Images lazy-loaded as cards entered the viewport. Sampled loaded images were 640×360 with descriptive alt text; no broken-image icon was observed. |
| 3.13 Repeat identical search/cache | PASS | Identical repeated search returned 17 of 17 from the recent-search cache in roughly 3.5 seconds and explicitly identified the cache. |
| 3.14 Listing modal scroll/expand/close | PARTIAL | Modal opened above the page, had internal scrolling (`2000px` content in `896px` viewport) and closed correctly. No Expand/Collapse control was present; see PT-012. |
| 3.15 Listing facts | PASS | Price, address, square feet, year built, days on market, bedrooms, bathrooms, lot size, listing type and listing number displayed when present. |
| 3.16 Unavailable fields | PARTIAL | No invented values were observed. Garage/pool used “Unavailable,” but missing units used an em dash instead of the same explicit label; see PT-013. |
| 3.17 Guest restrictions and account actions | PASS | Copy clearly required a free account for automated rent estimate and additional public-record details; Create Free Account and Sign In actions worked. |
| 3.18 Create Account above property card | PASS | Account modal opened above the listing card at z-index 13000. |
| 3.19 Sign In above property card | PASS | Sign-in modal opened above the listing card at z-index 13000. |
| 3.20 Close auth and preserve listing state | PASS | Entered $4,000 rent remained after opening and closing the sign-in modal; listing card remained intact. |

## Section 4 — Property-card screening calculations

| Test | Result | Notes |
|---|---|---|
| 4.1 Known-answer calculation | PASS | $500,000 price and $4,000 monthly rent produced $25,920 NOI, 5.18% cap rate, and the expected 5.0%–7.0% value ladder exactly. |
| 4.2 Editable-rent emphasis | PASS | Rent had a visible “Test Your Assumptions” control, total-property-rent guidance, and immediate output context. |
| 4.3 Change rent to $4,500 | PASS | NOI updated once to $29,160; cap rate to 5.83%; 6.5% value to $448,615. |
| 4.4 Desired cap rate of 6.25% | PASS | With $4,000 rent, value updated to exactly $414,720. |
| 4.5 Invalid and extreme numeric input | FAIL | Browser validity identified some ranges, but the card still displayed stale or calculated results for blank/out-of-range inputs; see PT-014. |
| 4.6 Quick-screen assumptions visible | PASS | 10% vacancy and 40% of EGI operating-expense assumptions were clearly displayed beside the results. |
| 4.7 Limitations/disclaimer | PASS | Page clearly stated preliminary screen, verified-data requirements, and not a replacement for complete underwriting. |
| 4.8 Carry listing into guided analysis | PARTIAL | Address and list price transferred once, but the manually entered $4,000 rent did not populate `f_rent`; see PT-015. Navigating away and Back also cleared the listing search state; see PT-016. |

## Section 5 — Free-analysis entry and seven-step workflow

| Test | Result | Notes |
|---|---|---|
| 5.1 Begin logged out | PASS | Clean home-page entry was available with the public toolbar and Sign In action. |
| 5.2 Optional address; required price/rent | PASS | Address was explicitly optional. Empty submission focused Acquisition Price; price and rent were explicitly required. |
| 5.3 Continuous address typing | PASS | Typed `4220 E Powhatan Ave, Tampa, FL` continuously; focus remained in the field and the cursor finished at position 30. |
| 5.4 Select address suggestion | PASS | Selecting the Tampa suggestion preserved and normalized the address to `4220 E Powhatan Ave, Tampa, FL 33610, USA`. |
| 5.5 Begin without account | PASS | $500,000 price and $4,000 rent opened the guided analysis without an account. |
| 5.6 Step 1 handoff/defaults | PASS | Step 1 opened with the selected address and $500,000 price. Step 2 retained $4,000 rent and visibly labeled 10% vacancy and 2% rent growth as suggested defaults. |
| 5.7 Forward/back persistence | PASS | Traversed all seven steps forward and backward. Address, price, land, units, hold, rent, vacancy, rent growth, expenses, loan terms and investment targets persisted. |
| 5.8 Input provenance | PASS | Workflow visibly distinguishes Required, Recommended, Suggested, Advanced / if applicable and Tax assumption inputs, with explanatory default copy. |
| 5.9 Numeric formats and invalid values | PASS | Currency punctuation typed into number inputs was safely ignored, decimals were accepted, and blank/zero/negative required price and rent values were rejected. |
| 5.10 Exact validation/preservation | PASS | Validation named Acquisition Price or Monthly Rent, focused the affected field and preserved all unrelated entries. |
| 5.11 Single final action | PASS | Step 7 displayed one clear `Calculate, Save & Review Results` action. |
| 5.12 Intermediate refresh | PASS | Refresh on Step 2 returned to Step 2 without page duplication or data loss; $4,000 rent, 8% vacancy and 3% growth persisted. |
| 5.13 Real-change leave warning | PASS | After the PT-017 correction, changing an analysis value and clicking Pricing displayed the unsaved-changes warning. Choosing Cancel kept the analysis open with all numbers intact. |
| 5.14 No false warning after save/finish | PASS | After the restored analysis calculated and saved, Glossary opened normally with no leave-page dialog or false unsaved-changes warning. |

## Section 6 — New-account creation and email verification

| Test | Result | Notes |
|---|---|---|
| 6.1 Step 7 account/save handoff | PASS | Logged-out `Calculate, Save & Review Results` opened the account workflow without losing the completed analysis. |
| 6.2 Focused account workflow | PASS | Create Free Account was the primary workflow; existing-user Sign In appeared as a separate secondary action. |
| 6.3 Mismatched passwords | PASS | Inline message stated `The password confirmation does not match.` and the account workflow remained open. |
| 6.4 Password below minimum | PASS | Matching short passwords produced `Enter an email and a password of at least 12 characters.` |
| 6.5 Turnstile and duplicate-submit protection | PASS | One account request completed after manual Turnstile. The creation form was replaced by the verification screen, preventing another Create Account submission. |
| 6.6 Account-creation timeout | PASS | Account creation completed and did not remain stuck on `Creating account`. |
| 6.7 Verification instructions | PASS | Instructions identified `jrmeloni@hotmail.com`, told the user to keep the original tab open, supported same- or different-device confirmation, and explicitly said not to reset the password. |
| 6.8 Single registration notification | PASS | One new-user registration notification arrived at `jamie@propertythesis.com`. |
| 6.9 Resend verification | PASS | Resend was invoked exactly once and displayed `Verification email resent. Check your inbox and spam folder.` Supabase still contained exactly one unverified Auth user for the address. |
| 6.10 Open confirmation on same computer | PASS | Confirmation opened in another browser page on the same computer and completed successfully. |
| 6.11 Continue in prior tab | PARTIAL | The confirmation page closed, but focus returned to the email rather than the original PropertyThesis tab. The original PropertyThesis tab remained open. |
| 6.12 Automatic detection/restoration | FAIL | The original tab did not automatically detect confirmation. The user had to use the other-device/browser fallback. See PT-018. |
| 6.13 Calculate and automatic Base Case save | PASS | The restored analysis calculated successfully, opened Review Results, and created exactly one property plus one `Base Case` analysis. Supabase stored desired cap `0.0625`, price `500000`, and rent `4000`. |
| 6.14 Single verified-user notification | PASS | Exactly one verified-user notification arrived at `jamie@propertythesis.com` for the completed v38 account-verification flow. |
| 6.15 Second account/phone confirmation | PASS | Recreated `jrmeloni@hotmail.com`, opened the confirmation email on a phone, confirmed successfully, used the original desktop tab's other-device recovery, signed in, and restored every controlled Step 7 value including the non-default 6.25% desired cap. |
| 6.16 Other-device/browser confirmation button | PASS | `I Confirmed on Another Device` detected the verified email and presented the local sign-in workflow. |
| 6.17 Sign-in and analysis restoration | PASS | v38 restored Step 7 with all controlled values intact: Tampa address, $500,000 price, $100,000 land, 2 units, 7-year hold, $4,000 rent/unit, 8% vacancy, 3% rent growth, 42% OpEx, $400,000 mortgage at 6.25% for 30 years, and the non-default 6.25% desired cap. |
| 6.18 No unsupported blank-tab path | PASS | The confirmation instructions offered return-to-original-tab and explicit other-device/browser recovery; no instruction to start in a new blank PropertyThesis tab was shown. |

## Section 7 — Existing-user authentication

| Test | Result | Notes |
|---|---|---|
| 7.1 Sign out | PASS | Sign-out immediately rendered the logged-out homepage at the canonical URL without requiring refresh; no modal remained open. |
| 7.2 Refresh while logged out | PASS | Refresh remained logged out and did not open an unsolicited sign-in modal. |
| 7.3 Public-toolbar Sign In | PASS | The standard site-wide `Sign in to PropertyThesis` modal opened inside the wrapper. |
| 7.4 Autocomplete/password-manager compatibility | PASS | Email is `type=email` with `autocomplete=username`; password is `type=password` with `autocomplete=current-password`. |
| 7.5 Incorrect password | PASS (RETEST) | After the live fix, the error remained visible, the email address remained entered, and only the incorrect password cleared. PT-019 resolved. |
| 7.6 Successful sign-in | PASS (SECOND RETEST) | After `5bb65ed`, the verified account opened directly on Existing Properties; the modal closed, guest content disappeared, and only the eight signed-in navigation options were visible. PT-020 resolved. |
| 7.7 Refresh while signed in | PASS | The authenticated session persisted for `jrmeloni@hotmail.com`; the modal and guest guidance stayed hidden, the account dashboard loaded once, and its empty saved-data state matched the reset test account. |
| 7.8 Second-tab authentication consistency | PASS | A second live-site tab recognized `jrmeloni@hotmail.com`, suppressed guest UI, and exposed the same eight signed-in navigation choices as the first tab. |
| 7.9 Forgot Password | PASS (RETEST) | The reset email opened the dedicated two-field password form, the new password was accepted, the temporary recovery session signed out, and subsequent sign-in with the new password opened Existing Properties. PT-021 resolved. |
| 7.10 Cross-tab sign-out | PASS (RETEST) | Signing out in the second authenticated chat-browser tab invalidated both sessions. Refreshing the first tab showed `Not signed in`, removed Sign Out, and exposed zero saved records; the briefly retained Existing Properties control disappeared during logged-out UI refresh and never exposed private data. |

## Section 8 — Saved-property and analysis lifecycle

| Test | Result | Notes |
|---|---|---|
| 8.1 Unique property cards | PASS | The synthetic baseline produced exactly 1 active property, 0 archived properties and 1 analysis; one property card rendered with no duplicate. |
| 8.2 Consistent card controls/layout | PASS | The sole active Base Case card displayed one coherent seven-action set with no duplicated controls: Open Property, Edit Guided Analysis, Start New Analysis, Client Report, Manage Analyses, Archive and Delete Property. |
| 8.3 Card metrics agree with saved analysis | PASS (RETEST) | After `3b445e9`, price, rent, cap rate, IRR, DSCR, NPV, scenario name, quality count and updated date matched the opened analysis. With no reconciled value saved, the card correctly displayed `Not entered`. PT-022 resolved. |
| 8.4 Property/latest-analysis hydration | PASS (RETEST) | After `3b445e9`, the Conservative Case saved with $10,000 Initial Repairs. Leaving, reopening the analysis and returning to Property Step 1 restored $10,000 along with the other assumptions. PT-023 resolved. |
| 8.5 Edit/save persistence | PASS | Changed vacancy from 8% to 9%, recalculated and saved, left for Existing Properties, reopened the property, and confirmed vacancy remained 9%. Dependent outputs updated to 10.13% cap rate and 19.22% IRR. |
| 8.6 Second analysis distinct name | PASS (RETEST) | The final save opened an accessible in-page naming dialog, accepted `Conservative Case`, closed after saving and increased the property to 2 analyses. PT-024 resolved. |
| 8.7 Duplicate scenario name | PASS (RETEST) | Submitting `Base Case` for the second analysis kept the naming dialog open and displayed `That scenario name already exists for this property. Choose a different name.` No overwrite occurred. |
| 8.8 Manage Analyses/version switching | PASS (RETEST) | Manage Analyses displayed both saved scenarios. Base Case reopened with $500,000 price / $4,000 rent; Conservative Case reopened with $480,000 price / $3,800 rent. |
| 8.9 Archive property | PASS | Archived the synthetic property. Counts changed from 1 active / 0 archived to 0 active / 1 archived, and the active dashboard showed no matching property cards. |
| 8.10 Restore archived property | PASS | With Show archived enabled, the archived card retained its Base Case analysis and metrics. Restore returned the dashboard to 1 active / 0 archived / 1 analysis without duplication. |
| 8.11 Delete disposable property | PASS (RETEST CLEANUP) | After fresh confirmation, deleted the recreated `100 Test Property Way, Tampa, FL 33602` property together with Base Case and Conservative Case. Counts returned to 0 active / 0 archived / 0 analyses. |
| 8.12 Refresh consistency | PASS | Reloaded the canonical live URL. The session remained signed in as `jrmeloni@hotmail.com`, Existing Properties reopened without a modal or warning, and the clean 0 / 0 / 0 saved-data state persisted. |

## Section 9 — Calculation and results regression

| Test | Result | Notes |
|---|---|---|
| 9.1 Known-answer full calculator | PASS (RETEST) | After deploying the state-aware results refresh, recreated and saved the known-answer property directly after the clean Section 8 state. The immediate results showed only the current analysis values; the prior $48,135 NOI, 10.03% cap and 21.99% IRR did not reappear. |
| 9.2 Income arithmetic reconciliation | PASS | $48,000 PGI − $4,800 vacancy = $43,200 EGI; 40% operating expenses = $17,280; NOI = $25,920; $25,920 ÷ $500,000 = 5.184%, displayed as 5.18%. |
| 9.3 Financing reconciliation | PASS | $400,000 amortizing loan at 6.25% for 30 years displayed a $2,462.87 monthly payment and $29,554 rounded annual debt service; Year 1 interest $24,867 plus principal $4,687 reconciled to $29,554. |
| 9.4 DSCR reconciliation | PASS | $25,920 NOI ÷ approximately $29,554 annual debt service = 0.877, displayed consistently as 0.88x. |
| 9.5 Cash-flow reconciliation | PASS | $25,920 NOI − $29,554 debt service = ($3,634) Year 1 before-tax cash flow. The separately identified ($3,778) tax benefit reconciled to $144 after-tax cash flow. |
| 9.6 Cash-on-cash reconciliation | PASS | The client report displayed $144 Year 1 after-tax cash flow, $100,000 initial cash investment and 0.14% after-tax cash-on-cash return; $144 ÷ $100,000 = 0.144%, displayed as 0.14%. |
| 9.7 NPV/IRR sensitivity | PASS | At the seven-year baseline, 3% appreciation produced 7.85% IRR and ($12,897) NPV. Raising appreciation to 5% increased IRR to 13.41% and NPV to $23,822; restoring 3% returned both metrics to baseline. |
| 9.8 Holding-period boundaries | PASS | One year produced a complete 1-Year Projection with Year 1 and no Year 2. Forty years produced a complete 40-Year Projection through Year 40 with no Year 41. Restoring seven years returned the 7.85% IRR and ($12,897) NPV baseline. |
| 9.9 Income-supported value reconciliation | PASS | Desired-cap value was $414,720, exactly $25,920 NOI ÷ 6.25%. The same NOI appeared in the decision center, offer analysis and detailed Year 1 cash-flow table. |
| 9.10 Cross-output consistency | PARTIAL (RETEST) | Review Results, detailed cash-flow tables, saved card and on-screen client report remained internally consistent. The saved-property report route now exposes both Download PDF and Download Pro Forma; the pro forma action completed without an application error. A human confirmation of the downloaded PDF remains outstanding because native/download UI is not observable by the automated browser. |
| 9.11 Automated calculation checks | PASS (RETEST) | Restored the Run QA Check control to the live Existing Properties dashboard. The recreated Base Case returned “Calculation QA PASS — 1 of 1 saved analyses match a fresh recalculation with no output drift.” A repository-wide syntax scan checked all 165 JavaScript files with zero failures. |

## Recorded defects

### PT-028 — P1 — Saved-property report route omits pro forma export

- Resolution: Extended the report-control initializer to run when a Client Report is opened directly from an Existing Properties card and deployed in `9f4c732`. The live retest displayed the complete Preview & Export area with Refresh Preview, Download PDF and Download Pro Forma; the pro forma action completed without an application error.
- Observed: Opening Client Report from a saved-property card showed the older report controls and omitted Download Pro Forma, even though the exporter was present in the application.
- Expected: Every route into Client Report exposes the same PDF and Excel pro forma exports.

### PT-027 — P1 — Live calculation QA checker is unavailable

- Resolution: Added the checker to the live application bundle, converted it to use the protected calculation service asynchronously, repaired the syntax error in `user-profile-branding.js`, and deployed in `ccac849`. Live retest passed 1 of 1 saved analyses with no output drift; all 165 JavaScript files passed syntax validation.
- Observed: `analysis-regression-checker.js` exists in the repository but is not included by the live application loader. Existing Properties therefore has no Run QA Check control and cannot compare saved outputs with a fresh recalculation. The repository-wide JavaScript syntax scan also found `user-profile-branding.js:123` fails with `Unexpected token ')'`.
- Expected: Load the QA checker for authorized testing/admin use and keep every shipped JavaScript file syntactically valid so automated regression checks can complete.
- Impact: Test 9.11 cannot provide the required saved-versus-recalculated regression result, and the repository contains a broken JavaScript asset.

### PT-025 — P1 — Immediate post-save results mix stale and current analyses

- Resolution: Added state-signature and generation guards to every delayed results refresh, queued forced hydration behind any in-flight refresh, and guarded the secondary-engine callback against state changes. Deployed in `ccac849`; the live immediate-post-save retest contained no stale Section 8 metrics.
- Reproduction: After deleting the Section 8 property, create and calculate the Section 9 known-answer property without reloading the app.
- Observed: The immediate results content mixed correct current values (NOI $25,920, cap 5.18%, IRR 7.85%) with stale deleted-scenario values (NOI $48,135, cap 10.03%, IRR 21.99%) in other result modules. The cloud-saved card was correct, and reopening that saved analysis refreshed the results consistently.
- Expected: Every results module must hydrate atomically from the just-calculated assumption set; no prior or deleted analysis values may remain visible.
- Impact: A user can see contradictory investment conclusions and metrics immediately after calculating a new property.

### PT-024 — P1 — Native scenario-name prompt blocks analysis saving

- Resolution: Replaced the native prompt with an accessible in-page naming dialog, added case-insensitive duplicate-name validation, deployed in `a371a13` with loader corrections in `3b445e9`, and passed live retests 8.6–8.8.
- Reproduction: Open a saved property, select Start New Analysis, complete all seven guided steps, and select Calculate, Save & Review Results.
- Observed: `protected-cloud-save-bridge.js` calls the browser-native `prompt()` to request the scenario name. In the in-app browser this throws `Error: prompt() is not supported`; no naming UI or error is shown, the analysis is not saved, and the user remains on the final guided step.
- Expected: Display an accessible in-page naming dialog that works consistently in supported browsers, validates a distinct scenario name, and gives durable success or error feedback.
- Impact: Users in environments that suppress native JavaScript dialogs cannot save a second analysis, test duplicate names, or use version switching.

### PT-022 — P2 — Property card invents a value conclusion fallback

- Resolution: Removed the acquisition-price fallback and display `Not entered` unless an explicit reconciled value exists. Deployed and live-retested in `3b445e9`.
- Observed: The saved property card displayed `Value Conclusion $500,000`, matching acquisition price, while the opened analysis explicitly prompted the user to enter a reconciled investment value and contained no conclusion.
- Expected: The card should show the saved reconciled value when one exists, or an explicit `Not entered`/`Unavailable` state when it does not; acquisition price should not silently become the value conclusion.

### PT-023 — P1 — Initial Repairs does not survive saved-analysis hydration

- Resolution: Added explicit input-time synchronization, protected-save persistence and saved-analysis hydration for Initial Repairs. Deployed and live-retested in `3b445e9`.
- Observed: The synthetic Base Case was created with $25,000 Initial Repairs & Improvements. Opening the saved property restored all other controlled assumptions, but `f_initialRepairs` was blank.
- Expected: Initial Repairs must persist and rehydrate with the saved analysis because it affects invested capital and return calculations.

### PT-021 — P1 — Password-reset link skips password update

- Resolution: Fixed and deployed in `84dbb3c`. Live retest passed end to end: reset delivery, dedicated two-field update form, successful password change, recovery-session sign-out, and subsequent sign-in with the new password.
- Reproduction: From the public Sign In modal, enter the account email, select Forgot Password, and follow the Reset Password link in the delivered email.
- Observed: The reset request and delivery succeed, but the link opens `https://propertythesis.com/index.html#` in an authenticated state without displaying fields to choose and confirm a new password.
- Expected: A recovery link should open a dedicated password-update state, require and validate a new password plus confirmation, report success, and then allow sign-in with the new password.
- Impact: A user can receive and follow the recovery email but cannot actually replace a forgotten password.

### PT-019 — P2 — Incorrect-password feedback disappears and clears the email

- Resolution: Fixed and deployed in `84dbb3c`. Live retest passed: invalid-sign-in feedback remained visible, the email was preserved, and only the password cleared.
- Reproduction: Open the public Sign In modal, enter a valid account email with an incorrect password, complete the security check, and submit.
- Observed: A sign-in failure message appeared briefly and disappeared. The email and password fields were cleared and the security check restarted, leaving no durable explanation visible.
- Expected: Keep a helpful invalid-credentials message visible, preserve the email address, clear only the password, and let the user retry without losing context.

### PT-018 — P1 — Verified-account sign-in loses the pending guest analysis

- Resolution: Fixed and deployed through commits `e38c548`, `7a99216`, `ca209c2`, `2a0a437`, and `627f555`. The final cause of the desired-cap regression was duplicate `f_desiredCap` elements: the authoritative field contained 6.25% while a hidden duplicate retained 6.5% and overwrote the captured draft. v38 ignores duplicate IDs after the first authoritative value and reapplies the draft after signed-in navigation.
- Retest: PASS — cross-browser email confirmation followed by local sign-in restored every controlled input, including desired cap 6.25%. Calculation opened Review Results and Supabase contained exactly one property and one `Base Case` analysis with desired cap `0.0625`.

- Reproduction: Complete a logged-out seven-step analysis, create and verify a new account in another browser context, return to the original tab, choose `I Confirmed on Another Device`, then sign in locally.
- Observed: Sign-in succeeded as `jrmeloni@hotmail.com`, but the app routed to an empty workspace showing zero properties and zero analyses. The preserved Step 7 draft disappeared from view and no Base Case was created.
- Database verification: The Auth user is confirmed and has a successful sign-in timestamp, but has zero `public.analyses` and zero `public.properties` rows.
- Expected: After local sign-in, restore the pending guest data, return to Step 7, calculate once and automatically save the first analysis as Base Case.
- Stop condition: The checklist requires stopping when the analysis is missing after verification.

### PT-017 — P1 — Unsaved-change protection silently blocks toolbar navigation

- Resolution: Fixed and deployed in commit `36ceb06`. Public toolbar and PropertyThesis home links now use the application confirmation when the analysis is dirty.
- Retest: PASS — warning appeared; Cancel preserved the active analysis and its numbers.

- Reproduction: Begin a logged-out analysis, change a value on an intermediate step, then click Pricing in the public toolbar.
- Observed: The page remains on the analysis and no confirmation, warning, or explanation appears; the toolbar link looks nonfunctional.
- Expected: A clear unsaved-changes confirmation appears, allowing the user to stay or knowingly discard the draft and continue.
- Scope found in code: The custom confirmation selector covers selected analysis-management actions but does not cover normal public-toolbar links, leaving those links dependent on the browser's inconsistent native `beforeunload` presentation.

### PT-001 — P2 — Outdated “Build the Case” copy remains on homepage

- Observed: The dark homepage hero says “Form the thesis. Test the numbers. Build the case.”
- Expected: Current brand language should use “Know the Numbers. Prove the Case.” or otherwise avoid the retired “Build the Case” wording.
- Reproducibility: Consistent on clean page load.

### PT-002 — P2 — Logged-out homepage attempts protected calculations

- Observed console errors:
  - `Uncaught Error: Protected calculation result is not loaded for this assumption set`
  - Two POST requests to a protected Supabase Edge Function returned `401 Unauthorized`
- Expected: Logged-out homepage should not invoke protected calculation functions before a protected analysis exists.
- User-visible impact during test: None yet.
- Risk: Avoidable network traffic, slower loading, and unstable initialization.

### PT-003 — P2 — Duplicate and legacy script initialization

- Observed warnings:
  - Legacy Google Places Autocomplete warning repeated multiple times
  - Parser-blocking Supabase CDN scripts repeated
  - Multiple GoTrueClient instances detected in the same browser context
  - Results hydration incomplete because protected calculation data was unavailable
- Expected: Each integration initializes once in the appropriate page state.
- Likely relationship: May share a root cause with PT-002 and timing/scroll behavior.

### PT-004 — P3 — Header logo lacks sharpness

- Observed: Circular wording and PropertyThesis wordmark are readable but visibly soft/pixelated at normal display size.
- Expected: Crisp logo edges and text while retaining the blended transparent background.

### PT-005 — P2 — Header-logo navigation causes intermittent visible scrolling

- Observed: Homepage briefly moves down and back up before ending at the top.
- Confirmed from:
  - Homepage
  - Search Listings
  - Sample Report
  - Sample Property Card
  - Pricing intermittently
- Glossary-to-home navigation passed without movement.
- Expected: Direct navigation to the homepage top with no visible movement.
- Likely cause: Competing browser scroll restoration, focus restoration, hash/query routing, or multiple scroll-to-top handlers.

### PT-006 — P2 — Public Start Free Analysis routes bypass simplified entry form

- Observed: Toolbar, hero, and bottom calls to action open Step 1 of the seven-step workflow directly.
- Expected: Every public Start Free Analysis action should move to the homepage “Start with what you know” form first.
- Reproducibility: Consistent across all three tested calls to action.

### PT-007 — P2 — Logged-out analysis displays account-style toolbar

- Observed in clean InPrivate guest session after Start Free Analysis:
  - New Analysis
  - Existing Properties
  - Search Listings
  - Search Saved
  - Search Clients
  - Mortgage Tools
  - Glossary
  - Sample Property Card
  - No Sign In action
- Expected: Guest-appropriate navigation with protected account actions hidden or clearly gated.
- Security status: No private data exposure observed during this run.

### PT-008 — P2 — Sample Report toolbar is inconsistent

- Observed:
  - Sample Report was replaced by Sample Pro Forma
  - Sign In was missing
  - Button order differed from the approved public toolbar
- Expected: Maintain the same public toolbar, with Sample Report shown as the current/active page; keep Sample Pro Forma as an in-page control.

### PT-009 — P2 — Pricing page removes its own toolbar link

- Observed: Pricing is absent from the Pricing page toolbar, shifting the remaining links.
- Expected: Maintain the standard public toolbar and mark Pricing as current/active rather than removing it.

### PT-010 — P2 — Invalid listing-filter ranges expose raw Edge Function error

- Reproduction: Set minimum price to $500,000 and maximum price to $300,000, then search.
- Observed: Results cleared and status displayed `Edge Function returned a non-2xx status code`.
- Expected: Client-side validation should identify the invalid range and avoid the API request.
- Risk: Confusing experience and unnecessary API usage.

### PT-011 — P2 — Listing Search button remains enabled during requests

- Observed: Status changed to “Searching active listings…” while the Search Listings button remained enabled.
- Expected: Disable the submit button, or otherwise prevent another submission, until the active request finishes.
- Risk: Duplicate RentCast/API calls and inconsistent result ordering if users click repeatedly.

### PT-012 — P2 — Listing property card has no Expand/Collapse control

- Observed: Listing modal opened with a fixed `896px` client height and `2000px` scroll height, but available controls were only Close, Create Free Account, Sign In and Start My Free Analysis.
- Expected: A visible manual Expand/Collapse control as previously requested, while retaining internal scrolling and Close.

### PT-013 — P3 — Missing listing values use inconsistent labels

- Observed: Garage and pool fields say “Unavailable,” while missing units display only an em dash.
- Expected: Use a consistent explicit “Unavailable” or “Not reported” label for absent source data.

### PT-014 — P2 — Property-card invalid values produce stale or misleading calculations

- Blank rent left the previous $25,920 NOI and 5.18% cap visible while the field itself was empty.
- Negative rent was browser-invalid but the card silently calculated $0 NOI and 0% cap.
- Extremely large rent had no upper guard and produced billion-percent output.
- Blank desired cap retained the prior 6.25% headline value.
- Zero desired cap silently reverted the headline to 6.5%.
- Negative and greater-than-20% cap inputs were browser-invalid but still generated income-supported values.
- Expected: Block recalculation and show a clear inline validation state for missing, out-of-range, or implausible inputs.

### PT-015 — P1 — Listing-card rent does not carry into guided analysis

- Reproduction: Open 1217 E Lambright St, enter $4,000 monthly gross rent, click Start My Free Analysis.
- Observed: Address and $307,500 price transferred to Step 1, but the underlying guided-analysis rent field `f_rent` was blank.
- Expected: The manually screened rent should carry into the Income step exactly once with the address, price, and available listing facts.
- Impact: User can unknowingly lose a primary screening assumption during the principal conversion path.

### PT-016 — P2 — Listing-search state is lost after full-page navigation

- Reproduction: Run a filtered listing search, open Sample Property Card through navigation, then use browser Back.
- Observed: Search page returned with blank criteria, initial status, and zero cards.
- Expected: Preserve recent search criteria/results for a reasonable Back-navigation workflow, or restore them from the recent-search cache.

## Batch-fix plan after public tests

Do not change the deployed version while Sections 1–4 are being tested unless a P0/P1 blocker is discovered. After Section 4:

1. Group defects by root cause.
2. Fix them in a dedicated reliability change set.
3. Run repository checks and calculation regressions.
4. Deploy once.
5. Rerun Sections 1–4 against the new commit.
6. Proceed to account creation and authenticated workflows only after the public regression passes.

## Local fix batch — 2026-08-31

Implemented locally; not yet committed or deployed:

- PT-001: replaced the retired homepage wording with “Know the Numbers. Prove the Case.” and “Prove the case.”
- PT-002: stopped results hydration from requesting protected calculations for signed-out visitors.
- PT-003: reused one shared Supabase browser client where the surrounding page already provides one. The legacy loader and Google Places migration warning remain separate follow-up work.
- PT-004: tightened the rendered wordmark text treatment for clearer edges while preserving the blended header treatment.
- PT-005: removed the multi-second scroll lock that caused visible down/up correction after navigation.
- PT-006: public Start Free Analysis entry points now lead to and focus the “Start with what you know” form unless listing starter data is already supplied.
- PT-007: the logged-out guided analysis retains the public toolbar instead of exposing the account workspace toolbar.
- PT-008/PT-009: normalized the Sample Report and Pricing toolbars, including current-page links and Sign In.
- PT-010/PT-011: added client-side min/max validation and a disabled “Searching…” request state before the listing Edge Function is called.
- PT-013/PT-014: standardized absent listing facts as “Not reported” and blocked invalid rent/cap-rate recalculation.
- PT-015: the property-card rent now transfers with address, price, and units into the guided analysis.
- PT-016: the latest guest search criteria and results restore for one hour when returning through browser Back.

Local browser verification passed for homepage content, CTA-to-starter-form behavior, known-answer sample-card calculations, invalid property-card inputs, invalid listing-range blocking, listing starter-field hydration, public guided-analysis toolbar, and Pricing/Sample Report toolbar composition.

### PT-020 — P2 — Successful sign-in does not open Existing Properties

- **Resolution:** Fixed through `84dbb3c` and `5bb65ed`. The first change detected early sessions; the second limited draft restoration to browser sessions that explicitly requested post-auth continuation. Live second retest passed with Existing Properties as the landing section.
- **Observed:** A successful existing-user sign-in produces a clean authenticated shell, but the active section remains the analysis/home section.
- **Expected:** Successful sign-in should immediately open Existing Properties so the returning user lands on their saved account workspace.
- **Impact:** Returning users receive no visible authentication error, but land in an unexpected workflow and must navigate manually to their saved properties.
