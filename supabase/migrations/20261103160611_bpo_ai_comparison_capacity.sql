-- Manual fields and the independent AI comparison snapshot share this document.
-- Keep a bounded payload and object validation without truncating either report.
alter table public.bpo_reports
  drop constraint bpo_reports_field_values_check,
  add constraint bpo_reports_field_values_check
    check (jsonb_typeof(field_values) = 'object'
      and octet_length(field_values::text) <= 2000000);
