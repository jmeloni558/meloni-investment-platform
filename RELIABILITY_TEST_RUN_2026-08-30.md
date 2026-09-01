# PropertyThesis Reliability Test Run — 2026-08-30

## Run information

- Tester: Jamie Meloni, guided by Codex
- Live URL: `https://propertythesis.com/`
- Branch: `main`
- Deployed commit: `627f555`
- Full local commit observed: `627f5552c3c156805a461638d1a58ec527847867`
- Deployment status: Success
- Browser: Microsoft Edge InPrivate
- Session state: Logged-out guest
- Status: In progress
- Next test: **7.1 Sign out and verify immediate logged-out home page**

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

## Recorded defects

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
