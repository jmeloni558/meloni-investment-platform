# Owner-only BPO pilot

Entry: Saved Properties dropdown > Comparable Sales / BPOs. Income Properties retains the existing calculator workflow.

## Scope and authorization

BPO access is an explicit server-managed `public.bpo_access` row per confirmed account UUID. Initial operational grants cover jamie@melonirealty.com, jamiemeloni2012@gmail.com and the existing confirmed jamiemeloni2012+... Gmail aliases authorized by Jamie. No automatic grant is created for future signups. No subscription, existing income property or billing entitlement is changed.

Staging project: oxyjbfhpsxaaerchyaql. Production: lmaiqpkogmmsldkziggy.
Rows and uploads belong only to their creator, including between two enabled pilot accounts. Revocation is immediate at the database layer. Frontend visibility is not an authorization boundary.

## Workflow

1. Create a BPO, enter the full address manually or find an active RentCast listing and explicitly apply its facts.
2. Save the BPO. Upload up to six PDF files per batch, 15 MB each, maximum 40 pages each.
3. Extraction occurs locally through pinned PDF.js 4.10.38. No third-party AI service receives MLS PDFs. Labeled text facts are presented for review; the user selects subject, closed comp 1–3 or active comp 1–3 and confirms before applying. New facts replace corresponding entered facts only after confirmation.
4. Edit the supplied form on-screen. Source pages 1–2 retained; old PDF scripts, appearance artifacts, submit controls, stale values and page-3 references removed. The original source file is unchanged.
5. Adjustments are signed dollar amounts. Blank adjustments count as zero. Net adjustments, adjusted prices, price per square foot and repair totals recalculate. Final opinion, condition, market trends, financing judgments, adjustments and signature are never inferred.
6. Save explicitly or download the two-page editable PDF. Optimistic revision matching prevents an older browser from overwriting a more recent save. Downloading does not save pending edits. PDF calculations are snapshots; edit/recalculate in the website before exporting again.

## Known first-pilot limits

- Parser supports labeled, text-based MLS property sheets, not arbitrary scanned images or every MLS matrix export layout. Scanned files can be stored for reference but need manual entry. Actual Stellar sample exports are needed for further format validation; only synthetic fixtures have been used in the import tests so far.
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
