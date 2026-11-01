# General BPO summary synthesis

General BPO Step 7 now saves the current facts and observations, then requests a structured narrative from the authenticated `bpo-summary` Edge Function. Notes are evidence to interpret and paraphrase, not paragraphs to append. The existing section headings, separate property header, PDF renderer, individual comparable order, conversational broker voice, and typical 3–5-page target remain in place. Sparse evidence must not be padded to reach a page count.

The server reads the caller's saved report at the requested revision. It supplies only schema-listed scalar BPO facts, normalized observations (including legacy notes/report comments), lot units, listing statuses, and explicit primary-comparable selections. Uploaded attachments, optional tax PDFs, prior narratives, and arbitrary caller-provided facts are excluded. Instructions require analytical comparisons, uncertainty/conflict handling, preservation of material observations, and no invented opinions, adjustments, weights, or values. Structured coverage and copied-passage checks prompt one rewrite on failure; these are guards, not a guarantee of semantic quality. User review remains necessary.

The function returns a draft and never writes the report. The client replaces the displayed draft only after successful validation against the saved revision and unchanged inputs. Original note boxes remain intact. An error preserves the previous narrative; there is no deterministic pasted-note fallback. Existing summaries are not regenerated automatically. RRR retains its existing generator.

## Publication order

Deploy `supabase/functions/bpo-summary/index.ts`, `handler.mjs`, and `contract.mjs`, including the imported sibling `supabase/functions/bpo-extract/fields.json`, to the production Supabase project before releasing the new frontend assets. Keep JWT verification enabled as configured in `supabase/config.toml`. The function uses the existing server-side `OPENAI_API_KEY`; optional `BPO_SUMMARY_MODEL` overrides the default `gpt-5-mini`. No database migration is required. Existing verified-account, BPO-access, per-user rate-limit and external-API quota infrastructure is reused. Credentials never reach the browser.

After deployment, test a real authorized report's draft generation without overwriting its saved narrative. Review whether each material observation is accurately integrated, comparisons support the entered conclusion, and the rendered PDF retains the established style and appropriate length. A real provider test is still required: local tests use simulated provider responses.

## Verification

- `node --test tests/bpo-summary-synthesis.test.cjs`: source boundaries, ownership/revisions, access/quota failures, copied-text retries, omitted coverage, section identities and client acceptance.
- `node tests/bpo-summary-synthesis-browser.cjs`: isolated browser persistence and generation flow; cancellation, provider/stale/malformed failures, original notes, draft review state, and save/reopen. Requires Playwright and the installed Windows Edge executable.
- `node --test tests/bpo-*.test.cjs`: existing BPO calculation, import, summary and PDF regressions (expand the glob in PowerShell).

The browser/provider fixtures are synthetic and do not write live reports or establish actual model writing quality.
