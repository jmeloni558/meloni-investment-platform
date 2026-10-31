# PropertyThesis Photo Uploads

Entry: `/photos.html`, or **Photos** immediately before Delete Property on a saved-property card for enabled accounts.

## Jamie's workflow

1. On Android, open the photo page in Chrome and sign in as jamie@melonirealty.com. Chrome's menu offers **Add to Home screen** / **Install app**. The page also offers an install button when Chrome makes its installation prompt available. No store publication or APK is required.
2. Enter the full property address. No BPO, RRR, client, analysis, subscription or valuation is required.
3. Select existing photos, then tap **Upload photos**. Keep the page open and connected until complete. Retry failed photos without reselecting the successful ones.
4. At the office, sign into the same account, open Photo Uploads, choose the address, and refresh if necessary.
5. On your PC, choose **Download All** or **Download Selected**, then extract the address-named ZIP folder. Choose a Dated option to enter a custom stamp date for JPG copies.

## Implementation

- Independent `photo_properties` records and private `property-photos` bucket. Storage object listing is the source of truth; no separate photo metadata write can orphan an uploaded photo from its address.
- Access is server-managed in `photo_library_access`; only Jamie's confirmed Meloni Realty account is enrolled initially. RLS enforces both enrollment and account/property ownership. The client does not authorize by email. New accounts have no access until explicitly enrolled.
- Original photo bytes are retained, including EXIF. Supported JPG, PNG, WebP, HEIC/HEIF; 25 MB per file. HEIC/HEIF originals download normally but browser previews are not guaranteed.
- SHA-256 plus a sanitized filename gives deterministic object names. Retries check for a completed object after an error, without overwriting an original. Same-name photos with different bytes remain distinct; download names add a hash suffix.
- ZIP exports are split into numbered archives at approximately 128 MiB of image bytes. There is no total photo-count cap. Allow multiple downloads in your browser for large sets. A failed export may leave completed archives; retry uses the same filenames.
- Online foreground uploads only. No background/offline upload promise or service-worker cache of private content. Navigating away loses unuploaded selections, with a browser leave warning where supported.
- Individual uploaded photos can be permanently deleted after confirmation, in active or completed sets. Original phone files are unaffected. Operational account deletion must remove objects via Storage API before deleting account identity. Recovery/retention inventories include both tables and the bucket. Database backups do not back up photo bytes; keep the field originals and office copies.
- Manifest and independent authenticated web route leave room for a future Android Trusted Web Activity or native wrapper. Store packaging/review is a separate future release.

## Verification

`node --test tests/photo-library.test.mjs tests/photo-recovery.test.cjs tests/bpo-client-form.test.cjs tests/rrr-workflow.test.cjs`

`node tests/photos-browser.cjs` uses Playwright (or `PLAYWRIGHT_MODULE`) and desktop Edge (`BROWSER_PATH` can override). Its synthetic backend exercises mobile address-only creation, interrupted upload/retry, duplicate avoidance, office access, exact ZIP contents and session clearing. It never uploads test photos to production.

`supabase/tests/photo_library_access.sql` runs production policy tests in a rolled-back transaction, including Storage access and revocation. Physical Android installation and a real account's phone-to-PC upload still require device verification.


## Active and completed photo sets

The photo app is self-contained: no main-website links, including at sign-in. Sign-in uses the same Supabase credentials and Cloudflare Turnstile verification directly on the photo page.

The default screen is **Active properties**. Opening an address shows its upload screen with **Back to addresses**. After uploading, **Mark upload set completed** saves a completion timestamp and returns to the active list. The address moves to **Completed photos**, where originals remain available for viewing and desktop downloads. **Reopen for uploads** moves the set back to active. Existing addresses start active; completion never deletes files. One address represents one set in this version; reopening extends that same set.

Phone-sized and installed app views hide download controls. Desktop browser views offer original and dated ZIP downloads for all or selected photos. Completion updates are restricted to the owning enabled account and only the completed_at column can be changed through this grant.


## Updating the installed app

Tap **Update app** in the header. It checks the live photo page without using the browser cache, then reopens it using a fresh URL. It stays inside Photo Uploads, preserves the signed-in session and cloud photos, and returns to the address list. The button is disabled while uploads/downloads or other library operations run. Pending selected photos require confirmation; canceling or a failed/offline update keeps the selection. Keep versioned CSS/JS entry URLs current with every release; bump imported module URLs too when their contents change.

To receive this button the first time, open the photo page once with a fresh query string (for example photos.html?refresh=update-button), then reopen the installed app. No reinstall is required.

There is no application-imposed photo-count limit per selection or property. The queue processes every selected valid file sequentially; object listing is paginated until exhausted. Device resources, connectivity and available backend storage still apply. Delete photo removes only the chosen object through the authenticated Storage API; failed/unconfirmed deletes retain the card, and RLS enforces account and property ownership.

## Delete multiple photos

Use each photo checkbox, or Select all, then Delete selected. One confirmation names the property and selected count. Clear selection cancels the selection without deleting. This works in active and completed sets on phone and PC. Large selections are sent in requests of at most 100 objects, with no overall selection cap. Only server-confirmed removals leave the gallery; failed or unconfirmed photos stay selected for retry. Selecting a different property, returning to the list or signing out clears selection. Phone originals are unaffected.


## Saved-property Photos and optional General BPO appendix

The main toolbar no longer includes Photo Uploads. Enabled accounts get **Photos** immediately before **Delete Property** on saved BPO and income-property cards. The link opens an existing matching photo address, or the active list if no match exists. Matching is case-insensitive with normalized spaces; a missing address is only prefilled on the active list. The user must click Create to create a photo record; opening Photos never creates one. Completed sets stay completed. No link back to the main website is added to the phone app.

Only General BPO's Final PDF Package includes the optional **Include photos in final package** checkbox, off by default. **Choose photos** shows active and completed photo addresses and thumbnail selection. Upload / manage opens the subject address separately; Refresh photos reloads uploads. Selected filenames and album ID are saved with the BPO's existing field_values JSON. Saving the BPO retains the choice. Income reports and RRR exports do not include this feature.

Selected JPG, PNG and WebP images are appended after the supporting PDFs, two per letter page with aspect ratio and orientation preserved. Report copies are reduced to at most 1800 pixels on the longest side; originals are untouched. HEIC/HEIF must be converted to JPG for report inclusion. Export with photos off never reads photo storage. Missing/deleted or unreadable selected images stop the export with instructions to reselect or omit them, rather than silently excluding evidence. An address change requires choosing photos again. The original BPO form fields remain editable.

`node tests/bpo-photo-report-browser.cjs` tests the exact package-panel/export functions with a synthetic backend, including unchecked default, opt-out without storage reads, saved-card placement, selected appendices, editable BPO fields, missing-photo errors and sign-out. It renders a PDF proof into the OS temporary directory. The photo-browser regression also tests saved-address links, duplicate avoidance and preservation of completed state. No production records are modified.


## Create without opening, capture dates and dated downloads

**Create** adds the address, clears/refocuses the address input, and stays on the active address list for consecutive entry. Duplicate addresses report their existing active/completed location without opening them. Saved-property Photos links still intentionally open the requested address.

Each caption shows **Taken: MM/DD/YY**, read lazily from the uploaded file's EXIF original/digitized date. Missing metadata displays **Not recorded**, never the upload timestamp. Camera calendar dates are not shifted by browser timezone. JPEG, PNG, HEIF and TIFF metadata use vendored exifr 7.1.3; WebP EXIF is unwrapped from its RIFF chunk.

PC download controls are **Download All**, **Download Selected**, **Download All Dated**, and **Download Selected Dated**. Both selected controls use the same checkboxes as bulk deletion. Folder saving and individual download buttons are removed. Ordinary ZIP entries preserve uploaded bytes exactly. There is no total photo-count/download-size cap; archives are split at approximately 128 MiB of image bytes to bound memory (allow multiple downloads when the browser asks). Extract each archive into the same address folder.

Dated downloads open an initially blank required date input each time. Cancel changes nothing. The entered date stamps the bottom right as MM/DD/YY, white with a dark outline, scaled to image dimensions. Copies are orientation-corrected JPGs at original dimensions, JPEG quality .95. HEIC conversion uses lazy-loaded heic2any 0.0.4 when native decoding is unavailable; unsupported/corrupt files fail visibly.

Canvas re-encoding removes old EXIF/XMP/IPTC dates, thumbnails and other source metadata from the dated copies. Piexifjs 1.0.6 inserts DateTime, DateTimeOriginal and DateTimeDigitized with the entered date at 00:00:00, and Orientation=1. The ZIP entry date also uses the chosen date (clamped to ZIP's 1980–2107 timestamp range only). Uploaded originals, their metadata and caption dates remain unchanged. Original filename extensions are retained in the dated JPG filename to avoid collisions between same-stem inputs of different formats.

`node tests/photo-dates-browser.cjs` checks consecutive creation, duplicate handling, real capture dates, unknown dates, timezone handling, blank required date/cancel, selected/all downloads, JPEG/PNG/WebP output, original-byte preservation, independent EXIF reads, orientation and corrupt-input failure. Set HEIC_FIXTURE to a local HEIC file for real HEIC conversion coverage. Visual stamp and gallery proofs go to the OS temporary directory. Runtime libraries and upstream license files are vendored under assets/vendor.

## Delete a property and all its photos

Open an active or completed address and choose **Delete property**. Confirmation names the address and makes clear that every uploaded photo in that photo-app property is permanently removed. Phone/PC originals and saved BPO records are unaffected. Empty properties can also be removed.

The authenticated delete_photo_property RPC first sets deleting_at, then the browser lists all photos and removes them via Storage API in batches of 100. A final RPC removes the parent only when Storage metadata confirms that no objects remain under its prefix. There is no direct authenticated table DELETE grant. Private SECURITY DEFINER functions check the current account and active photo-library access; the public wrapper is SECURITY INVOKER. The upload INSERT policy acquires a share lock on the property so in-flight metadata inserts finish before deletion starts, and subsequent uploads are denied once deleting_at is set. No physical photo deletion is attempted through SQL.

Unconfirmed/failed removals keep the property and remaining photos accessible. Upload and completion controls stay hidden for a deletion in progress; reopen the address and click Delete property again to retry. The operation clears any pending local upload selection only after deletion starts.

Verification: photo-browser tests cover canceled/denied deletion, a completed 105-photo property, partial removal, reload/retry, failure of the final RPC, empty-property deletion and return to the address list. supabase/tests/photo_property_delete.sql checks owner-only access, upload blocking, nonempty guards and direct-permission denial in a rolled-back transaction with synthetic metadata. The existing photo-library RLS regression also passes. Security advisors show no findings for the new photo functions.
