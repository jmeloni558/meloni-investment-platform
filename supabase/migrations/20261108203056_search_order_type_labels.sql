create or replace function public.search_field_orders(search_text text)
returns setof public.field_orders
language sql stable security invoker set search_path='' as $$
  select f.* from public.field_orders f
  where length(trim(search_text)) > 0 and not exists (
    select from regexp_split_to_table(lower(trim(search_text)), '[[:space:]]+') term
    where strpos(lower(concat_ws(' ', f.address, f.client, f.kind,
      case f.kind when 'Int BPO' then 'Interior BPO' when 'Ext BPO' then 'Exterior BPO'
                  when 'PDCR' then 'Data Collection Report' end,
      f.todo_title, f.notes, f.due::text)),term)=0
  );
$$;
