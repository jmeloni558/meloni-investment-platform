-- Compare complete addresses, retaining house and unit numbers.
create function private.order_address_key(value text) returns text
language sql immutable strict set search_path='' as $$
 select trim(regexp_replace(regexp_replace(lower(value),'[.,]','','g'),'[[:space:]]+',' ','g'));
$$;
revoke all on function private.order_address_key(text) from public,anon,authenticated;

grant update(needs_photos) on public.field_orders to authenticated;
create or replace function private.field_order_photos() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 if tg_op='INSERT' and new.needs_photos then
   select photo_owner into strict owner_id from public.order_members where user_id=auth.uid();
   insert into public.photo_properties(user_id,address,dashboard_set) values(owner_id,new.address,true) returning id into new.photo_id;
 elsif tg_op='UPDATE' then
   if not new.needs_photos and old.needs_photos then
     new.photo_id:=null;
   elsif new.needs_photos and not old.needs_photos and new.photo_id is null then
     select photo_owner into strict owner_id from public.order_members where user_id=auth.uid();
     perform pg_advisory_xact_lock(hashtextextended(owner_id::text || ':' || private.order_address_key(new.address),0));
     select p.id into new.photo_id from public.photo_properties p
       where p.user_id=owner_id and private.order_address_key(p.address)=private.order_address_key(new.address)
       and not exists(select from public.field_orders f where f.photo_id=p.id)
       order by (p.archived_at is null) desc,(p.completed_at is null) desc,p.created_at desc,p.id limit 1 for update;
     if new.photo_id is null then
       insert into public.photo_properties(user_id,address,dashboard_set) values(owner_id,new.address,true) returning id into new.photo_id;
     end if;
   end if;
   if new.complete and not old.complete and new.photo_id is not null then
     update public.photo_properties set completed_at=coalesce(completed_at,now()), archived_at=coalesce(archived_at,now()) where id=new.photo_id;
   end if;
 end if;
 new.updated_at=clock_timestamp();
 return new;
end $$;
