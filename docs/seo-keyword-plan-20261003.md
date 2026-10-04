# PropertyThesis SEO priorities — October 3, 2026

## Recommendation and evidence

Target US rental-property investors and agents preparing an investor analysis. Priorities below are qualitative search-intent and product-fit judgments, not measured monthly volume, difficulty or ranking forecasts. No Search Console or paid keyword database was accessed.

Search results for rental property calculators consistently combine cash flow, cap rate and return analysis. DealCheck's own product and help pages connect analysis with acquisition costs, projections, offer evaluation and professional reports. PropertyThesis should explain its actual guided workflow and PDF/Excel deliverables rather than repeat a generic list of investment terms.

| Intent | Target phrases | Main destination |
| --- | --- | --- |
| Use a tool | rental property calculator; rental property analysis software; investment property calculator | Homepage |
| Prepare a report | rental property pro forma; rental property Excel report; investment property analysis report | New pro forma guide and existing sample views |
| Learn a calculation | how to calculate rental property cash flow | Existing cash-flow guide |
| Understand valuation | cap rate formula; cap rate vs cash-on-cash return | Existing cap-rate and cash-on-cash guides |
| Evaluate financing | rental property DSCR; debt service coverage ratio | Existing DSCR guide |
| Evaluate a purchase | how to analyze a rental property | Existing analysis guide |
| Agent workflow | rental property analysis for real estate agents; investor client reports | Homepage audience copy and pro forma guide |

Avoid separate near-duplicate pages for every calculator synonym. Do not target property management, tenant screening, vacation-rental forecasting, BRRRR/refinance tools, or tax-preparation services without matching functionality. Local Tampa/Lutz brokerage terms should not displace national software intent.

## Implemented change set

- Consistent homepage title, descriptions and visible H1 around rental property calculation and analysis.
- Human-readable initial HTML, real guide links and useful no-JavaScript/load-failure fallback.
- Permit crawling app-core.html as a rendering resource. Direct core retains noindex; public loader replaces that directive before writing the homepage document.
- New substantive pro forma guide with an explicit hypothetical worked example, inputs, spreadsheet/report explanation and agent workflow.
- Links from initial and rendered homepage and guides hub; sitemap entry; parseable article metadata.
- Preserve calculator, Auth, billing, privacy and production environment configuration. No meta-keywords or fabricated ratings. Staging retains its separate noindex controls; this change set targets production source only.

## Follow-up measurement

After publication, use Google Search Console URL Inspection for the homepage and new guide, inspect rendered HTML and canonical selection, and submit the sitemap if not already submitted. Track nonbrand impressions, clicks, CTR, query/page pairs and analysis starts/account creation over 28-day windows. Use actual queries to refine wording and prioritize useful guide expansions. No ranking or traffic improvement is guaranteed; recrawl/indexing timing is controlled by search engines.

Useful next content work: add distinct worked examples to existing cash-flow, cap-rate and DSCR guides; publish an agent reporting walkthrough; document methodology and model limitations with owner review. Avoid claiming individual professional authorship/review without that person's actual review.

## Research sources

- https://dealcheck.io/ — competing product positioning and analysis/report workflow.
- https://help.dealcheck.io/en/collections/1141312-analyzing-properties — rental analysis topics.
- https://www.realdata.com/ — investment analysis terminology and education positioning.
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide — descriptive content, links and audience needs.
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics — rendering resources, canonical handling, noindex and fingerprinting.
- https://developers.google.com/search/docs/appearance/title-link — descriptive titles aligned with visible content.
- https://developers.google.com/search/docs/crawling-indexing/robots/intro — crawling versus indexing controls.
