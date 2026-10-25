# Subject-owned income comp workflow — 2026-10-25

Staging deployment: https://db39105b.propertythesis-staging.pages.dev
Custom domain: https://staging.propertythesis.com
Source commit: ce6add5 (codex/income-comparables)
Archive SHA-256: da5516bb7f7ffe30fc3dfac90449ecac3e8c7e9c15bb89513b004704e35cf22b
341 files uploaded successfully; Cloudflare reported deployment success.

New comps use a six-step independent form and the protected income calculation engine. They save as embedded evidence under the saved subject, without creating standalone properties or overwriting subject assumptions. Calculated cap rate leads the review and manager. Rental/sales comparable links are absent from the comp workflow. Legacy linked comps remain supported.

Verification: 14 regression tests passed; focused workflow tests re-run after autocomplete cleanup, 2 passed. Tests cover create/edit/reload/report, cap math, account change, invalid inputs, failed save and cancellation. Local Edge form layout inspected. All three deployed JavaScript modules match candidate SHA-256; live index references new form. iOS verification returns 200 with frame-ancestors capacitor://localhost preserved.

No authenticated end-to-end save with the newly deployed form has been performed yet. Address suggestion availability remains a separate verification item. Production website and native apps were not changed. Existing evidence-table backup integration requires no schema change for these embedded comp assumptions.
