-- Read-only counts; a paused queue is not a stalled sender.
select jsonb_build_object(
 'enabled',(select enabled from onboarding_private.settings),
 'failed',(select count(*) from onboarding_private.deliveries where status='failed'),
 'uncertain',(select count(*) from onboarding_private.deliveries where status='uncertain'),
 'stale_claims',(select count(*) from onboarding_private.deliveries where status='claimed' and claimed_at<now()-interval '10 minutes'),
 'overdue_when_enabled',(select count(*) from onboarding_private.members where exists(select 1 from onboarding_private.settings where enabled) and stopped_at is null and next_step<7 and (next_step=0 or tips) and next_due<now()-interval '1 hour'),
 'scheduler_active',exists(select 1 from cron.job where jobname='customer-onboarding-every-15-minutes' and active)
) as health;
