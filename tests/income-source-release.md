# Income source guidance staging verification — 2026-10-25

Source commit a17f059. Owner completed Cloudflare deployment.
Verified https://staging.propertythesis.com serves all three income-comp modules matching the tested candidate byte-for-byte (SHA-256). Property deletion module also matches; iOS verification page returns 200.

Income Source defaults to MLS data. Income period dropdown defaults to Past 12 months. Guidance explains MLS figures may be actual or estimated and period labels do not convert amounts. Existing recorded periods are retained as selected options when editing. All 14 regression tests passed before packaging, including defaults and legacy-period preservation.

Archive: PropertyThesis-staging-income-source-2026-10-25.zip
SHA-256: 169b62d9f49fcb20d9a287105fcdad2e7ae789bf1a0832d82c986d4106f69ae5
Production and native app bundles unchanged.
