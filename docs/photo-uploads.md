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
- No deletion UI in this first version. Operational account deletion must remove objects via Storage API before deleting account identity. Recovery/retention inventories include both tables and the bucket. Database backups do not back up photo bytes; keep the field originals and office copies.
- Manifest and independent authenticated web route leave room for a future Android Trusted Web Activity or native wrapper. Store packaging/review is a separate future release.

## Verification

`node --test tests/photo-library.test.mjs tests/photo-recovery.test.cjs tests/bpo-client-form.test.cjs tests/rrr-workflow.test.cjs`

`node tests/photos-browser.cjs` uses Playwright (or `PLAYWRIGHT_MODULE`) and desktop Edge (`BROWSER_PATH` can override). Its synthetic backend exercises mobile address-only creation, interrupted upload/retry, duplicate avoidance, office access, exact ZIP contents and session clearing. It never uploads test photos to production.

`supabase/tests/photo_library_access.sql` runs production policy tests in a rolled-back transaction, including Storage access and revocation. Physical Android installation and a real account's phone-to-PC upload still require device verification.
