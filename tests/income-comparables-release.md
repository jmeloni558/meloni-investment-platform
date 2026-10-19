# Income comparable analyses — release candidate

Status: development candidate; staging table installed; not published.

## Workflow
1. Save each comparable property and its income analysis using the existing calculator.
2. Open the subject property's Income Comps panel and select the comparable's saved analysis.
3. Record the closed sale price/date, actual/normalized/projected income basis, income period, source and comparability notes.
4. Calculate and save a snapshot using the existing server income engine. Cap rate is annual NOI divided by closed sale price, excluding financing and income taxes.
5. Include/exclude comps, review the range and median, and explicitly select a market cap rate with a reason.
6. Apply the selected rate to the open subject analysis and save that analysis. The report includes the comp table, sources, rationale and indicated value.

Comps belong to the subject property across its analyses. Refreshing or changing the evidence clears the prior reconciliation. Source edits do not silently change saved snapshots. Existing property/analysis limits still apply to comparable properties. No separate automatic comparable-data provider is introduced.

## Verified
- 10 model and synthetic DOM tests pass.
- Staging transaction test passed for revision checks, account ownership and subject-delete cascade; fixtures rolled back.
- Desktop synthetic preview inspected.
- Production assets and database unchanged.

## Required before production
- Run the full signed-in staging workflow against the deployed income engine, including reload and a second session.
- Visually verify a generated multipage PDF with a long evidence set.
- Include property_income_comparables in data export, encrypted recovery, restore, retention inventory and deletion verification. The existing operational retention-restore-preflight.cjs is outside this tracked candidate and currently lacks this table. Do not bypass its schema-drift gate.
- Preserve current staging authentication/verification assets from the concurrent Mac/iOS work when packaging deployment.
- Test responsive layout in the real app shell and keyboard interactions.
- Native Android/iOS adoption requires separate integration and builds; this change does not update installed apps.

## Files
- income-comparables-model.js: calculation/evidence contract and report section.
- income-comparables.js: property panel, persistence, revision conflict handling and explicit adoption.
- supabase/migrations/20261019195402_property_income_comparables.sql: staging-installed migration with account isolation.
- tests/income-comparables*.test.cjs: Node tests (UI test needs jsdom).
- tests/income-comparables-preview.html: synthetic local preview, not a deployment acceptance test.
