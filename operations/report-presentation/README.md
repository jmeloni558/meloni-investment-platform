# Reader-focused website reports

This website-only renderer is derived from the existing accessible native PDF renderer. Native app sources and installed app bundles are unchanged. The `operations` directory is excluded from the public Jekyll output.

With esbuild, pdf-lib and @pdf-lib/fontkit installed or available through NODE_PATH, run `node operations/report-presentation/build.cjs` from the checkout. The output is `website-report-pdf.reader-20261025.js`, loaded by `user-branded-pdf.reader-20261025.js`.

The report adapter uses the reviewed report DOM. It skips hidden legacy conclusions, groups metric cards, preserves tables and disclosures, and places profile identity in the header only. The narrative enhancer reads rendered figures rather than recalculating or changing saved assumptions. Income-comp comparisons use included positive-NOI sales and the current subject Desired Cap Rate; saved notes never override that target.

Verification: report-reader-presentation tests cover comp/no-comp/excluded/missing/cash cases, repeated rendering, and profile escaping. Existing income-comp/UI/unit-rent/financing regressions pass. The 20-row PDF fixture exercises multi-page tables with the new renderer. A private presentation preview from the user's supplied report was rendered and inspected outside this repository; no customer fixture or profile was committed.

Prepared as a review candidate. No deployment or production data changes are part of this presentation work.
