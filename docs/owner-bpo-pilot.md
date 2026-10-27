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
