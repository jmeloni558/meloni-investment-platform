# Owner-only BPO pilot

Entry: Saved Properties dropdown > Comparable Sales / BPOs. Income Properties retains the existing calculator workflow.

## Scope and authorization

BPO access is an explicit server-managed `public.bpo_access` row per confirmed account UUID. Initial operational grants cover jamie@melonirealty.com, jamiemeloni2012@gmail.com and the existing confirmed jamiemeloni2012+... Gmail aliases authorized by Jamie. No automatic grant is created for future signups. No subscription, existing income property or billing entitlement is changed.

Staging project: oxyjbfhpsxaaerchyaql. Production: lmaiqpkogmmsldkziggy.
Rows and uploads belong only to their creator, including between two enabled pilot accounts. Revocation is immediate at the database layer. Frontend visibility is not an authorization boundary.

## Workflow

1. Create a BPO, enter the full address manually or find an active RentCast listing and explicitly apply its facts.
2. Save the BPO. Upload up to six PDF files per batch, 15 MB each, maximum 40 pages each.
3. After upload, `bpo-extract` reads the saved private PDFs and sends them to the existing OpenAI API integration using `gpt-5-mini`, structured output and `store:false`. The UI discloses this. PDF.js validates page limits locally. The endpoint verifies live Auth, explicit BPO access, report ownership/revision and document paths; Storage uses the caller's RLS permissions. No signed URLs, credentials or unrelated account documents are sent. Sources are untrusted data, not instructions. The server rejects unknown fields, calculated totals, adjustments, final opinions and unsupported citations. Existing manual values and occupied comparable identities are preserved. AI draft fields are saved automatically; final review remains required.
4. Edit the supplied form on-screen. Source pages 1–2 retained; old PDF scripts, appearance artifacts, submit controls, stale values and page-3 references removed. The original source file is unchanged.
5. Adjustments are signed dollar amounts. Blank adjustments count as zero. Net adjustments, adjusted prices, price per square foot and repair totals recalculate. Final opinion, condition, market trends, financing judgments, adjustments and signature are never inferred.
6. Save manual edits explicitly or download the two-page editable PDF. Optimistic revision matching prevents an older browser from overwriting a more recent save. Downloading does not save pending edits. PDF calculations are snapshots; edit/recalculate in the website before exporting again. Source notes are collapsed; the editable form opens after AI fills it. Existing attachments can be processed with “Fill form from uploaded files.”
7. Each source file has View and Delete controls. Deletion uses private Storage removal, then saves the attachment list. It requires confirmation, preserves form values and marks retained citations as source-deleted. Failures retain a retry path. The UI locks editing during asynchronous operations.

## Known first-pilot limits

- AI supports text PDFs and scanned PDF pages. Facts remain fallible and require source review. Twelve documents maximum, six uploads per batch, 40 pages per file and 25 MB combined per extraction. Errors never fall back to fabricated facts; files remain saved for retry/manual entry. API rate limits protect the private pilot.
- Missing or ambiguous source facts require review; no market-value judgment or adjustment amount is invented. Three sold and three active comps match the supplied form.
- Full form uses horizontal scrolling on narrow screens. Desktop is the preferred BPO editing surface.
- Typed signature is not a cryptographic digital signature.
- This website pilot is not an Android/iOS binary update.

## Data and recovery

`bpo_reports.field_values` stores form values and private PDF attachment references. Private bucket `bpo-documents` contains original uploaded PDFs under user UUID / BPO UUID / random PDF UUID.
Database logical backups include BPO records and access grants; recovery inventory and deletion checks now recognize both tables and the Storage bucket. Database backups contain Storage metadata, not PDF bytes. Keep the original MLS exports; do not treat the database checkpoint as a backup of uploaded PDF contents. Account deletion must remove uploaded objects via Storage API before deleting Auth identity, and the active-data check will continue to flag surviving objects.

## Verification

- tests/bpo-core.test.cjs: signed adjustments, invalid numeric rejection, distinct MLS records, missing facts, preserved final opinion, two-page interactive export.
- tests/bpo-browser.cjs: owner menu, manual/listing subjects, synthetic PDF upload and review, save/reopen, download, optimistic conflict, session clearing and subscriber gate; desktop/mobile screenshots.
- supabase/tests/bpo_access.sql: authenticated-role tests in a rolled-back transaction for owner save/update, revision, immutable ownership, second owner isolation, subscriber denial, private uploads, self-promotion denial and revocation. Passed in staging and production; no fixtures retained.
- tests/bpo-recovery.test.cjs: BPO rows prevent a false clean-deletion result.

Build: use operations/bpo/build.cjs with the existing pdf-lib/esbuild dependencies. Template preparation requires the user-provided source PDF path as its first argument; assets are committed so runtime does not require that local file.

## Five-step adjustment preparation (October 27)

The saved BPO workflow is Subject, Comps, Neighborhood & Market, Adjustments, then BPO Report. Step 4 stores its living-area rate, component breakdowns and generated-value tracking inside the existing private field_values JSON under _adjustments. No new table or access grant is required.

Clear dollar/percentage concessions in a sold comp's financing text are subtracted from its sold price; unknown, ambiguous, requested or unsupported amounts remain review items. Percentage amounts use the sold price. Active/pending prices do not receive automatic concession deductions. A user-entered nonnegative living-area rate produces (subject GLA - comp GLA) times rate, rounded to cents. Source values must be present and positive. Existing manual adjustments are preserved, including overrides made in the final form. Use the explicit automatic-value buttons to restore the source/rate calculation. Revisit Step 4 after changing source facts or rates.

All feature adjustments are signed dollar amounts for each comparable. Beds/baths sum to the form's rooms row; porch/patio/deck/fireplace sum to the porches row; fence/pool sum to the pool row. Editing a helper component explicitly replaces its grouped row. Form-level overrides are preserved on subsequent visits until a component is deliberately edited again. Unknown features do not receive guessed adjustments. Final opinions remain manual.

Tests: bpo-adjustments.test.cjs checks concession parsing, sign direction, missing facts, rate updates, manual preservation, grouped sums, invalid input and exported PDF field values. The browser fixture tests all five steps, rate and component entry, manual overrides, persistence and export.

## Blanket adjustment workflow refinement

Step 4 shows one set of common factors without individual comparable panels. Bedrooms, bathrooms, year built and living area use (subject minus comparable) times the entered nonnegative rate. Remaining features accept signed flat dollar amounts applied to every sold/active comparable. No inference is made from qualitative descriptions. Missing numeric facts are review items, not zero. Factors are saved per BPO in _adjustments.globals (living area retains _adjustments.rate).

Generated amounts update as factors change. Step 5 manual exceptions and prior manual adjustments are preserved. The explicit Apply entered factors to all comps action replaces individual overrides only in categories with entered factors; blank categories and final opinion are untouched. Legacy per-comp helper breakdowns remain backward compatible until a blanket factor manages their shared PDF row. Clearing a factor removes its generated amount without deleting manual overrides.


## Summary and package
Steps 6 and 7 provide an editable fact-based narrative and local combined PDF download. The summary follows the BPO Summaries format: header, subject/market, individual sold and active/pending discussions, conclusion. It does not infer comparable weighting or final value. Preparers replace writing prompts and confirm review. BPO fact changes invalidate that confirmation. Narrative and document roles/order persist in field_values. No permissions or schema changes.

Package order: editable BPO, summary, tax/IMAPP, optional subject MLS, sold, active/pending. Every upload must be assigned or excluded. Originals remain unchanged. Interactive supporting PDFs require a separate static copy to prevent broken form fields; the BPO remains interactive. Corrupt/encrypted source PDFs fail by filename. Six-comp draft pagination is tested at 2-3 pages; additional narrative may extend it.

Narrative refinement: the manual Toscana package is a style reference only. Subject/market/competition notes, per-comp rationale, primary sold selection and conclusion persist in _summaryNotes. Draft generation describes actual adjustment amounts and asking-price versus value differences. Notes are included in staleness checks. Generating a new draft explicitly confirms replacing manual narrative edits; existing summaries are never replaced automatically. No reference property facts are hardcoded. Short sections stay together in the PDF.

New Analysis now offers Income Analysis (existing calculator) and Comparable Sales (new BPO Step 1) to enabled pilot accounts. Step 1 saves the subject before advancing; unfinished BPOs are listed and can be reopened. Selecting primaryActive is optional and persisted with summary notes; it identifies competitive context rather than a closed-sale benchmark. Existing custom summaries are never regenerated by changing the selection.

## Approved v14 integration (2026-10-28)
The website uses the approved two-page v14 form. `prepare-v14.py` builds explicit web-to-PDF mapping: 499 controls resolve to 452 canonical AcroForm fields. Shared subject widgets retain one canonical field per fact. ZIP and county statistics are separate; removed legacy fields are excluded from extraction. Extraction cannot select primary comps or invent adjustment/value opinions.

Validation includes a cited source fixture through server sanitization, client application, recalculation, PDF export and reopen; separate fence/pool/fireplace adjustments; currency appearances; primary-comp address labels and stable selection values; desktop/mobile workflow and persistence. Uploaded sources remain untrusted. Auth, ownership, explicit owner-pilot grants and Storage restrictions are unchanged. Existing practice BPOs are not rewritten in bulk.

PDF export retains the approved interactive calculations and formatting. Use Adobe Acrobat for desktop editing. Browser PDF viewers may not execute PDF JavaScript; the website calculates values before export.

General summary revision 4: distinct Subject Information and Market Information sections, each sold and active/pending comp individually, then Conclusion. All nine note fields are retained, including comp notes awaiting an address. Notes and BPO conclusion comments coexist. Reported similarities/differences explain comparability; major adjustments support the discussion rather than restating the entire grid. Market timing and value reconciliation remain grounded in entered evidence, without generating a value or inferring weights. Typical six-comp PDFs target 3–5 pages; sparse reports stay shorter and long user notes are never truncated. Existing reviewed drafts remain unchanged until replacement is confirmed. RRR stays on narrative version 2.

General BPO site/parking factors: acres display at most two decimals in both subject columns, all comps, and summaries. Source lot area remains available for unit round trips, including imported lots. New siteRate multiplies the displayed subject-minus-comp lot difference in the shared unit; switching units converts the entered rate. Attached garage, detached garage, and carport values are separate per-bay factors, summed as subject parking value minus comp parking value into the existing garage/carport row. Explicit counts/types are required; unknowns or a missing rate for a differing category produce a review message. Carport rates cannot exceed garage rates, and detached rates cannot exceed attached rates. Legacy flat site/garage factors retain their semantics until the corresponding new factor is entered; manual row overrides remain protected. Bare Pool/Swimming pool descriptions now count as a pool in both grids, while above-ground/community pools retain existing zero-private-pool treatment. Unplatted is described as an unplatted area of the county rather than a neighborhood name. No saved report rows were changed by this release work.


## Optional AI BPO (November 1, 2026)

General BPO Step 1 offers Generate AI BPO beside Continue Manual BPO after source analysis has produced subject living area/address and a priced sold comparable. Generation saves the current report, requests the authenticated bpo-generate function, validates the response and revision, and saves an independent _aiBpo snapshot before opening Step 8. No steps are added. Manual fields, adjustments, narrative and review requirements are unchanged. RRR retains its existing export path.

Step 8 places Download AI BPO beside the existing complete-package download. It exports the AI form, AI summary and ordered uploaded sources, resolving source roles from their upload groups for this export only. Optional selected photos are included. AI narratives do not claim human review, and the AI form's signature is blank. Changes to facts, source membership or extraction invalidate the saved AI result. Provider, validation and save failures leave the user in Step 1 with prior work preserved. Old uploads lacking source tracking can qualify when each extractable file has a live citation; otherwise Read uploaded files again refreshes tracking.

Deployment: publish supabase/functions/bpo-generate (index.ts, handler.mjs, contract.mjs, completion.mjs, sources.mjs and the imported bpo-summary/contract.mjs and bpo-extract/fields.json) with JWT verification enabled before releasing app-core.html, bpo-workspace.ai-bpo-v1.js and bpo-core.ai-bpo-v1.js. Existing OPENAI_API_KEY is reused; BPO_GENERATE_MODEL optionally overrides gpt-5-mini. No database migration is needed. The server reads only the caller-owned saved report, checks live verified-account/BPO access, quotas and revision, and never writes the report itself.

Validation: 181 BPO unit/integration tests passed, including nine new generation tests. The isolated Edge browser test covers generation failure/retry, Step 1 directly to Step 8, actual combined PDF download, manual-value preservation, reopen and manual continuation. Provider responses are simulated; deployment and a live-model quality check are still required. Browser runner: tests/bpo-generate-browser.cjs (PLAYWRIGHT_MODULE can point to an installed playwright-core module). No live customer report was changed.


### AI form completion correction (November 1, 2026)
The first live PDF check verified totals and package assembly but missed form completeness. Version 2 of the AI snapshot now requires a decision for every applicable missing text field and choice group, supported condition/quality descriptions, primary active selection, repair disposition and form comments. The original PDFs remain the evidence. Unsupported data is displayed as N/P, inapplicable fields as N/A, and unused comparable slots as Not supplied; these markers never enter numeric calculations. Unknown repair costs are not displayed as a zero estimate. Omitted adjustment amounts display $0 with a legend explaining that no supported dollar change was applied. The signature remains blank. These rules apply only to AI snapshots; the manual workflow is unchanged. Earlier AI snapshots must be regenerated.

Validation: 184 BPO tests passed, including completion coverage, rejected partial/injected responses, both primary selections, condition/market controls, zero adjustments, missing-data distinctions, canonical PDF values and widget appearances. The isolated browser test passed generation/retry, Step 8 transition, package download, persistence and manual continuation. Live-model verification is performed against the separate synthetic test report before acceptance; mathematical and download checks alone are insufficient.
