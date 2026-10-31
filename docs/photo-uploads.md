# PropertyThesis Photo Uploads

Entry: `/photos.html`, or **Photo Uploads** in the signed-in website toolbar for enabled accounts.

## Jamie's workflow

1. On Android, open the photo page in Chrome and sign in as jamie@melonirealty.com. Chrome's menu offers **Add to Home screen** / **Install app**. The page also offers an install button when Chrome makes its installation prompt available. No store publication or APK is required.
2. Enter the full property address. No BPO, RRR, client, analysis, subscription or valuation is required.
3. Select existing photos, then tap **Upload photos**. Keep the page open and connected until complete. Retry failed photos without reselecting the successful ones.
4. At the office, sign into the same account, open Photo Uploads, choose the address, and refresh if necessary.
5. In desktop Chrome/Edge, **Save to PC folder** asks for a destination and creates a subfolder named for the address. Otherwise **Download ZIP**, then extract the address-named folder. Individual downloads are also available.

## Implementation

- Independent `photo_properties` records and private `property-photos` bucket. Storage object listing is the source of truth; no separate photo metadata write can orphan an uploaded photo from its address.
- Access is server-managed in `photo_library_access`; only Jamie's confirmed Meloni Realty account is enrolled initially. RLS enforces both enrollment and account/property ownership. The client does not authorize by email. New accounts have no access until explicitly enrolled.
- Original photo bytes are retained, including EXIF. Supported JPG, PNG, WebP, HEIC/HEIF; 25 MB per file. HEIC/HEIF originals download normally but browser previews are not guaranteed.
- SHA-256 plus a sanitized filename gives deterministic object names. Retries check for a completed object after an error, without overwriting an original. Same-name photos with different bytes remain distinct; download names add a hash suffix.
- Folder export writes one photo at a time. ZIP export is limited to 250 MB total to bound browser memory; use desktop folder export for larger libraries. A failed folder export may leave completed files; retry uses the same filenames.
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

Phone-sized and installed app views hide download controls. Desktop browser views retain folder and ZIP downloads. Completion updates are restricted to the owning enabled account and only the completed_at column can be changed through this grant.


## Updating the installed app

Tap **Update app** in the header. It checks the live photo page without using the browser cache, then reopens it using a fresh URL. It stays inside Photo Uploads, preserves the signed-in session and cloud photos, and returns to the address list. The button is disabled while uploads/downloads or other library operations run. Pending selected photos require confirmation; canceling or a failed/offline update keeps the selection. Keep versioned CSS/JS entry URLs current with every release; bump imported module URLs too when their contents change.

To receive this button the first time, open the photo page once with a fresh query string (for example photos.html?refresh=update-button), then reopen the installed app. No reinstall is required.

There is no application-imposed photo-count limit per selection or property. The queue processes every selected valid file sequentially; object listing is paginated until exhausted. Device resources, connectivity and available backend storage still apply. Delete photo removes only the chosen object through the authenticated Storage API; failed/unconfirmed deletes retain the card, and RLS enforces account and property ownership.
