create table public.order_bpo_drafts (
  order_id uuid primary key references public.field_orders(id) on delete cascade,
  report_id uuid not null unique references public.bpo_reports(id) on delete cascade
);
alter table public.order_bpo_drafts enable row level security;
revoke all on public.order_bpo_drafts from public, anon, authenticated;
grant select on public.order_bpo_drafts to authenticated;
create policy dashboard_members_read on public.order_bpo_drafts for select to authenticated
using (exists(select 1 from public.order_members));

create function public.start_rrr_order_draft(p_order uuid)
returns table(report_id uuid, created boolean)
language plpgsql security definer set search_path='' as $$
declare o public.field_orders; rid uuid;
begin
  if not exists(select 1 from public.order_members where user_id=auth.uid())
     or not public.bpo_enabled() then raise exception 'BPO access required'; end if;
  select * into strict o from public.field_orders where id=p_order for update;
  select d.report_id into rid from public.order_bpo_drafts d where d.order_id=p_order;
  if found then return query select rid,false; return; end if;
  if lower(trim(o.client)) not in ('rrr','rrreview') or o.kind not in ('Int BPO','Ext BPO','Desktop BPO')
     or o.list_name is not null or o.former_list_task is true then raise exception 'Select an RRReview BPO order'; end if;
  insert into public.bpo_reports(user_id,address,field_values)
    values(auth.uid(),o.address,jsonb_build_object('_clientTemplate','rrr','_clientTemplateChosen',true,'field_0008',o.address))
    returning id into rid;
  insert into public.order_bpo_drafts values(p_order,rid);
  return query select rid,true;
end $$;
revoke all on function public.start_rrr_order_draft(uuid) from public,anon,authenticated;
grant execute on function public.start_rrr_order_draft(uuid) to authenticated;
