# General BPO - Fix and Flip

This workflow branches from current General BPO with a persisted `_clientTemplate: "fix-flip"`. Repair Estimate is Step 3; the remaining General steps move one position, for nine total. Ordinary General, RRR, BOA and Stewart step counts are unchanged. New draft URLs retain their client selection.

Repair data is saved in `_fixFlip` inside the existing report's `field_values`. No database migration or backend deployment is required. The library keeps Fix and Flip records separate from General records. Incomplete repair estimates can be saved; numerical validation occurs when generating the repair report or exporting a complete package.

Photo review is an explicit external-assistant workflow: separate folder and website instructions, a generated prompt, and append-only JSON import. The app does not fetch links, bypass MLS authentication or assert that it viewed images. Imported findings identify their evidence basis and remain editable alongside manual repairs. An observed item requires review notes and an image/source reference. Changing a source link resets its review status to pending. No photos and inaccessible photos remain valid paths for manual repairs and allowances.

All financial inputs start blank. List price is optional. The as-is value and ARV here are user-entered investment assumptions, independent of the BPO or AI value opinion. Closing, holding, financing and other costs require explicit entries, including zero when excluded. Repair low/high/budget values must be consistent; contingency applies to repairs. ROI uses net resale proceeds less total investment divided by total investment. The midpoint scenario uses the midpoint acquisition price, never averaged returns. This is a project return on cost, not annualized or equity cash-on-cash ROI.

The standalone report is generated from current inputs, with repair scope/ranges/budgets, provenance, assumptions, and ROI scenarios. Complete packages append this report after the BPO summary and before supporting source PDFs. The original editable BPO form remains interactive. AI BPO generation remains available and its package includes current user-entered repair/ROI assumptions separately from the AI opinion.

Build using the repository's existing esbuild dependency and `node operations/bpo/build.cjs`, then copy `bpo-core.js` to `bpo-core.fix-flip-v1.js` and `bpo-workspace.js` to `bpo-workspace.fix-flip-v1.js`. `app-core.html` references these versioned assets. Preserve historical assets used by earlier releases.

Verification:
- `node --test tests/bpo-fix-flip.test.cjs tests/bpo-core.test.cjs tests/bpo-client-form.test.cjs tests/bpo-v14.test.cjs tests/bpo-adjustments.test.cjs tests/bpo-summary.test.cjs tests/bpo-source-uploads.test.cjs tests/bpo-generate.test.cjs`
- `node tests/bpo-fix-flip-browser.cjs` (Playwright and local Edge; mocked auth/persistence, no live records).
- Render PDFs under `output/fix-flip` with Poppler. These are synthetic QA artifacts, not property estimates or defaults.

Deployment: local implementation only; no publication or production writes performed.
