create table private.desktop_folder_tickets (
 ticket uuid primary key default gen_random_uuid(),
 order_id uuid not null references private.order_folder_jobs(order_id) on delete cascade,
 expires_at timestamptz not null default now()+interval '90 seconds'
);
revoke all on private.desktop_folder_tickets from public,anon,authenticated;
create function public.issue_desktop_folder_ticket(job_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid;
begin
 if not exists(select from public.order_members where user_id=auth.uid()) then raise exception 'Dashboard access required'; end if;
 delete from private.desktop_folder_tickets where expires_at<=now();
 insert into private.desktop_folder_tickets(order_id) select order_id from private.order_folder_jobs where order_id=job_id and folder_url is not null returning ticket into strict t;
 return t;
end $$;
create function public.take_desktop_folder_ticket(worker_key text,open_ticket uuid) returns text language plpgsql security definer set search_path='' as $$
declare link text;
begin
 if not exists(select from private.order_folder_worker where key_hash=pg_catalog.sha256(pg_catalog.convert_to(worker_key,'UTF8'))) then raise exception 'Invalid worker'; end if;
 delete from private.desktop_folder_tickets t using private.order_folder_jobs j where t.ticket=open_ticket and t.expires_at>now() and j.order_id=t.order_id returning j.folder_url into link;
 return link;
end $$;
revoke all on function public.issue_desktop_folder_ticket(uuid),public.take_desktop_folder_ticket(text,uuid) from public,anon,authenticated;
grant execute on function public.issue_desktop_folder_ticket(uuid) to authenticated;
grant execute on function public.take_desktop_folder_ticket(text,uuid) to anon;
