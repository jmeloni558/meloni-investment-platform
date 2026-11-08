alter table public.field_orders
  add column order_link text check (order_link ~* '^https?://[^[:space:]/?#]+[^[:space:]]*$'),
  add column lockbox_code text;
grant insert(order_link,lockbox_code), update(order_link,lockbox_code)
  on public.field_orders to authenticated;

-- Carry forward a single unambiguous field-order portal URL for active work.
with links as (
  select f.id, min(m[1]) as url
  from public.field_orders f
  cross join lateral regexp_matches(f.notes, '(https?://[^[:space:]<>"'']+)', 'gi') m
  where not f.complete and f.list_name is null
  group by f.id having count(distinct m[1])=1
)
update public.field_orders f set order_link=links.url
from links where f.id=links.id and f.order_link is null
  and links.url ~* '^https://(validityinspection\.com|captureapi-prod\.azurewebsites\.net)/'
  and links.url !~ '[.,;:!?)]$';
