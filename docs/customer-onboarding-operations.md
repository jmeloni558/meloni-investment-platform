# Customer onboarding operations

One welcome after verified registration; six weekly tips only with optional signup consent. No existing-user backfill. Android early access is offered by reply. Stripe receipts remain separate. This candidate does not activate production delivery.

## Staging evidence â€” October 4, 2026

Verification-to-welcome completed with one accepted message reported delivered by Resend. The owner confirmed a second signup returned to staging and displayed email confirmed; Auth independently confirms this. The campaign was paused and that second account was not enrolled.

Browser unsubscribe updates the preference and displays confirmation. GET does not unsubscribe. SQL rollback tests cover six-step order/timing, duplicate receipts, welcome-only without consent, deletion and permissions. Handler/signature tests pass. Signed HTTP suppression passed with an application-generated event; actual Resend-origin webhook delivery is still unverified.

## Production sequence

1. Install SQL with default enabled=false; deploy Edge with ONBOARDING_ENABLED=false. Public unsubscribe/webhook routes use token/signature authentication.
2. Configure private scheduler secret in Edge and Vault, production Resend webhook signing secret, and the scheduler target. Never store secret values in source or logs.
3. Publish consent UI and preference page; allow the exact production unsubscribe endpoint in Cloudflare form-action, preserving existing directives. Verify Auth Site URL and confirmation redirect.
4. Verify Resend-origin webhook delivery, tracking settings and provider message/log retention. Configure operational alerts before unattended activation.
5. Obtain production enrollment/test-recipient approval. Temporarily restrict ONBOARDING_TEST_RECIPIENTS to that recipient; reset enroll_after before signup and enable both gates. Verify confirmation, welcome and unsubscribe. Pause afterward.
6. Before future-user activation, remove the production test allowlist and reset enroll_after to activation time. A leftover allowlist cancels other users' deliveries. Do not backfill paused test accounts.

## Pause and reconciliation

Emergency pause: `update onboarding_private.settings set enabled=false;`. Also disable ONBOARDING_ENABLED for a longer shutdown. An already in-flight provider request may complete.

Run customer-onboarding-health.sql. Investigate failed/uncertain/stale claims and overdue members when enabled. Check cron and pg_net HTTP responses: successful enqueue is not delivery. A quiet queue alone does not prove scheduler health.

Do not reset/delete deliveries merely to retry. Reconcile Resend provider IDs or idempotency key onboarding-<delivery UUID>. Accepted is not proof of inbox delivery. Keep unknown outcomes held; do not assume indefinite provider deduplication. Correct known outcomes transactionally after review, without advancing a member twice or re-enrolling stopped accounts.

The health query is an operator check, not an automatic alert. Production activation is pending the remaining checks above.
