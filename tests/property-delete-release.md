# Staging property deletion fix — 2026-10-25

Cause: shared preview guards blocked the Delete Property buttons. Direct table DELETE is intentionally revoked. No whole-property RPC existed.

Installed staging-only website_shared_property_delete(uuid,integer), with account ownership, revision, child ownership and paid-purchase record guards. Anonymous execution is revoked; existing direct table permissions remain unchanged. Foreign keys cascade analyses/scenarios/history/income comps. Letters remain with null links. No production schema or website changes.

Frontend property-deletion.js captures the three delete-button entry points and uses the RPC after confirmation. Errors remain visible; local data is cleared only after confirmed server deletion and unchanged account.

Validation: 3 UI tests passed. Transactional database test passed ownership, revision, paid-record guard, related-record cascade, control-property preservation and function grants. Synthetic fixtures were rolled back.

Deployment status: backend installed, FRONTEND ZIP NOT YET DEPLOYED. Desktop automation failed with "foreground window did not report a process id" while attempting to reconnect to Edge. Awaiting unlocked/foreground Edge.

Prepared archive: ../staging-income-comps-20261025/PropertyThesis-staging-property-delete-2026-10-25.zip
Files: 342
SHA256: fb0f09ef7dc97a4c3d8e7088ff993a6e64e3b5aefbdd1ffa887caf2241b1aa4a
