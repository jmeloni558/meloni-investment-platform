alter table public.order_clients add column listed boolean not null default true;
update public.order_clients set listed=false
where name in ('BPO Training','Loan Officers','Amy Spears','Ana Kantrowitz','Andrew Lehrer','AS',
  'Barry Worland','Carolyn','Elene Paredes','FA / Class','Jack','JP','VC / Class','VG','Use Link',
  'TVC','FD','iBuy Homes','Nancy Lucas','SH');
