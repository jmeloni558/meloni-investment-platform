create function public.add_order_client(client_name text) returns text
language sql security invoker set search_path='' as $$
  insert into public.order_clients(name) values(btrim(client_name))
  on conflict (lower(name)) do update set listed=true
  returning name;
$$;
revoke all on function public.add_order_client(text) from public,anon;
grant execute on function public.add_order_client(text) to authenticated;
