# RRR 0.4.0 verification — October 29, 2026

The authorized live Subject Information and Comparable Information tabs were checked without saving, validating or submitting the RRR order.

- Three active MLS IDs, six explicit A/C checkboxes and two remaining numeric sold concessions filled through the extension. One sold concession was first entered separately to verify portal behavior.
- Three subject fields filled through the extension: ownership, market trend and qualified market context.
- One explicit pond view was selected as Water; the exporter now maps that exact category.
- All six adjusted prices remained equal to the reviewed BPO values after concessions were populated. No double deduction occurred.
- All bath, living-area and garage fields from the earlier test remained present.
- Current occupancy, listing status, utilities and inspection date were left blank as requested. The historical subject sold date was not reused as inspection date.
- Locked subject room/lot values are not overwritten. Ambiguous architecture, physical pools, missing original listing dates, units and tax/parcel data remain manual. Two active MLS records contain conflicting garage-space descriptions and require source review.
- 24 automated tests passed, including source ambiguity, empty checkbox handling, existing-value preservation, address conflicts and concession dependencies.

The importer only fills its approved two tabs. Saving and submission remain with the user. Private property transfer data and screenshots are excluded from this repository.

## 0.5.0 follow-up

- 29 automated checks pass for source matching, conflicts, defaults, original listing history, closed financing and existing-value preservation.
- Actual uploaded MLS text was parsed using the same PDF.js path as the browser export: seven unique subject/comparable records matched. No additional AI request is used.
- Live preview offered 41 new comparable-grid fields and one subject style field. All were populated and verified; no Save, Validate or Submit was clicked.
- Original price/date and sale type populated for all six comps; closed financing populated for the three sold comps. Financing is disabled by RRR for active listings.
- Owner rules: one unit per comp, A/C checked, one-story Ranch/two-story 2 Story, only private inground pools qualify. Unknowns remain unresolved.
- RRR derives DOM as elapsed listing-to-sale days for sold comps; this differs from MLS active days. Its locked subject style mirrors the saved Subject Information tab, so review after saving that tab.
- RRR left one zero-adjustment calculated price blank; re-entering the existing zero and tabbing triggered its normal calculation. All six adjusted prices then matched the reviewed BPO. The importer does not write calculated fields.
- Current subject occupancy, listing status, utilities and inspection remain unverified and blank. Historical subject listing data is deliberately excluded from current listing inputs.
