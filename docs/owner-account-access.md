# Account roles

- `jamie@melonirealty.com`: complimentary owner access, granted to the confirmed account UUID on September 4, 2026.
- `jrmeloni@hotmail.com`: normal customer rules for purchase, subscription, cancellation, and refund testing. Existing unlocked properties and payment history retained.
- `jamiemeloni2012@gmail.com`: normal free-account rules; its legacy property retains its existing access. Use a new Gmail alias when testing a first-ever signup/free property.

Owner access is held in `public.account_access_overrides`. Authenticated users can read only their own row and cannot create, update, or delete grants. No browser email allowlist, user metadata, or Stripe subscription is used to grant access.

The owner can analyze unlimited properties belonging to their account, generate reports, and use up to 500 daily listing-data requests and 500 AI messages. Daily quotas for property lookup, rental support, and sales comparables are raised to at least 500. Provider/site-wide monthly budgets and short burst protections still apply. Owner access does not grant access to other users' data.

`claim_property_access` checks property ownership before the owner grant. It does not manufacture permanent per-property entitlements, so deactivating the owner row restores normal rules immediately. `get_account_access` reads current database state, avoiding stale role claims. The UI displays owner access and suppresses upgrade prompts. Checkout also rejects owner purchases server-side.

The account grant is an operational data change, not a migration tied to a specific production user. No subscriptions, payments, or saved analyses were deleted or reset.

## Verification

Run `supabase/tests/owner_account_access.sql` against this project to test access, account isolation, attempts to self-promote, owner and normal quotas, monthly budgets, short burst limits, and revocation. All test fixtures and quota reservations roll back. The fixture emails refer to these existing testing accounts; they receive no lasting permission changes.

Supabase's security advisor flags the existing authenticated `claim_property_access` SECURITY DEFINER RPC. Its privilege is intentional for claiming entitlements, with an authenticated ID check and property-ownership check covered by the regression test. Other advisories are backend-only RLS tables with no client policies and the previously accepted leaked-password-protection plan limitation.
