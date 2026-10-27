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
