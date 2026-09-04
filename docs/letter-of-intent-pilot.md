# Letter of Intent owner pilot

## Scope

`letter-of-intent.html` creates preliminary discussion-only LOIs from saved,
completed analyses. Entry point: Review Results > Make the Offer > Prepare Letter
of Intent. The page also lets the owner select another completed saved analysis.
The sender explicitly enters the proposed price; a saved acquisition price is
only a starting value. No private underwriting or report is sent.

This template is **not legally approved**. No contract, signature collection,
acceptance, exclusivity, confidentiality, or payment is implemented. Obtain
qualified legal review before public or real-world use; the title “LOI” alone
does not determine legal effect. No representation relationship is established
by use of the software. Sources reviewed:
- https://www.floridabar.org/public/consumer/tip012/
- https://trerc.tamu.edu/article/commercial-letters-of-intent/

## Sending configuration

- Existing `RESEND_API_KEY` is used server-side; no key reaches the client.
- `LOI_FROM`, or existing `REGISTRATION_NOTIFICATION_FROM`, is the verified
  sender. Fallback: `PropertyThesis <notifications@propertythesis.com>`.
- Reply-To is always the current Auth user's verified email, never client input.
- **Default: self-addressed test emails only.** `LOI_PILOT_EXTERNAL_ENABLED`
  must be exactly `true` to permit other recipients. Do not enable until explicit
  owner approval after reviewing the template. Even then, owner role is required.
- No unsolicited test is sent during deployment. Use explicit user approval for
  a single self-addressed test; no listing agent or seller should be contacted.
- Pilot limit: 10 send attempts/user/day plus 60 API requests/user/minute.

## Security and consistency

`letter-of-intent` keeps `verify_jwt=true`, uses `withSupabase({auth:'user'})`,
then verifies the current server-managed owner override and live Auth email.
All analysis/property queries require the caller's user ID plus RLS. A completed
analysis requires positive saved price/rent and finite NOI/IRR outputs.

The server normalizes bounded terms, renders one canonical plain-text/HTML
letter, hashes the document/recipient/sender, and saves an immutable preview.
Only the saved ID, hash and explicit confirmation are accepted for sending.
There is no arbitrary email-body, sender, attachment, or recipient-list endpoint.
Text is escaped for HTML; CR/LF/control characters in fields are rejected.

Sending rechecks ownership, owner status, verified sender, current analysis
version, pilot recipient restriction and quota. Atomic `prepared -> sending`
compare-and-set and a provider idempotency key prevent duplicate sends. An
identical preview fingerprint resolves to the existing letter.

Provider timeout/ambiguous response => `unknown`; no automatic retries. A crash
may leave `sending`. Check the provider before any manual recovery. Do not reset
status blindly. `submitted` means accepted by the email API, **not** inbox
delivery or acceptance of terms. Delivery webhooks are not part of this version.

RLS exposes own owner-pilot records only; authenticated clients have no write
privilege. Records survive analysis/property deletion for history but cannot be
sent after deletion. Account deletion cascades records. Retention policy and
customer-facing privacy updates are public-rollout prerequisites.

## Verification and rollout

- `node --test tests/letter-of-intent*.test.mjs`
- Run `supabase/tests/letter_of_intent_rls.sql` (transaction with rollback).
- Browser: owner can open form; other users denied; no saved completed analysis
  yields guidance; edit invalidates preview; review/confirm/send once; history;
  mobile width and keyboard navigation; existing analysis/toolbar regression.
- Verify one authorized self-addressed email, exact wording, subject, Reply-To
  and provider record. No invoice/Stripe functions or plan pricing changed.
- Obtain template approval, test provider failures/delivery reporting and review
  retention/abuse controls before considering paid-user rollout.

### Initial verification — September 4, 2026

- 15 automated template/handler tests passed, including cross-user access,
  confirmation/hash matching, stale analysis, duplicate/concurrent requests,
  provider rejection, timeout and missing configuration.
- Live transaction-only RLS test passed and rolled back; revoked owner denied.
- Live unauthenticated endpoint call returned 401.
- Owner Edge session: context/analysis selection, immutable preview, exact
  terms/envelope, edit invalidation and duplicate preview reuse passed.
- Live email delivery is pending explicit user approval of one self-addressed
  test. No email was sent during the initial implementation.
- Security advisor reported no new LOI issue. Existing project findings remain:
  intentional claim_property_access definer RPC and plan-limited password leak
  protection. No unrelated settings changed.
