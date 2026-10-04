-- INSTALLATION TEMPLATE ONLY: do not run until the secret is privately configured
-- in BOTH Supabase Vault (customer_onboarding_cron_secret) and Edge secrets
-- (ONBOARDING_CRON_SECRET). No secret value belongs in this source file.
-- Replace PROJECT_REF with the verified deployment target before execution.
-- Database settings.enabled and Edge ONBOARDING_ENABLED must both be true to send.
select cron.schedule('customer-onboarding-every-15-minutes','*/15 * * * *', $job$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/customer-onboarding/send',
    headers := jsonb_build_object('Content-Type','application/json','x-onboarding-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='customer_onboarding_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) where exists(select 1 from onboarding_private.settings where enabled)
    and exists(select 1 from vault.decrypted_secrets where name='customer_onboarding_cron_secret');
$job$);

-- Health review: failed/uncertain jobs require reconciliation, never a blind resend.
-- select status,count(*) from onboarding_private.deliveries group by status;
-- select count(*) from onboarding_private.members m where stopped_at is null
--   and next_step<7 and next_due < now()-interval '1 hour';
-- Emergency pause (no data deletion):
-- update onboarding_private.settings set enabled=false;
