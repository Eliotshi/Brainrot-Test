-- ============================================================
-- Lot 1 · Tracking first-party (aucun service tiers, aucun cookie)
-- Additive : compatible avec le code déjà en production.
-- ============================================================

create table if not exists public.tracking_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  session_id  uuid not null,
  result_id   uuid,
  type        text not null,
  n           int,
  question_id text,
  variant     text,
  props       jsonb
);
create index if not exists tracking_events_session_idx on public.tracking_events (session_id);
create index if not exists tracking_events_created_idx on public.tracking_events (created_at desc);
create index if not exists tracking_events_type_idx    on public.tracking_events (type, created_at desc);

alter table public.tracking_events enable row level security;
revoke all on public.tracking_events from anon, authenticated;

-- Un événement (objet) ou un lot d'événements (tableau, 30 max).
create or replace function public.cc_log_event(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  allowed constant text[] := array['start','question_n','complete','email_view','email_submit','optin','share',
                                   'invite_click','gate_skip','invite_landing','resume','duel_complete'];
begin
  if jsonb_typeof(p) = 'object' then p := jsonb_build_array(p); end if;
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 30 then raise exception 'invalid_batch'; end if;
  for e in select * from jsonb_array_elements(p) loop
    if not (e->>'type' = any(allowed)) then continue; end if;
    if e->>'session_id' !~ '^[0-9a-f-]{36}$' then continue; end if;
    if e ? 'props' and pg_column_size(e->'props') > 2048 then continue; end if;
    -- plafond par session (anti-abus)
    if (select count(*) from public.tracking_events t where t.session_id = (e->>'session_id')::uuid) >= 400 then continue; end if;
    insert into public.tracking_events (session_id, result_id, type, n, question_id, variant, props)
    values ((e->>'session_id')::uuid,
            case when e->>'result_id' ~ '^[0-9a-f-]{36}$' then (e->>'result_id')::uuid end,
            e->>'type',
            case when e->>'n' ~ '^[0-9]{1,3}$' then (e->>'n')::int end,
            left(e->>'question_id', 12),
            left(e->>'variant', 8),
            case when jsonb_typeof(e->'props') = 'object' then e->'props' end);
  end loop;
end $$;

-- Entonnoir quotidien par variante (une ligne par session, puis agrégat).
-- security_invoker + aucun grant : illisible avec la clé publishable, lu via cc_admin_funnel.
create or replace view public.funnel_daily with (security_invoker = true) as
with s as (
  select session_id,
         min(created_at)::date as day,
         coalesce(max(variant), '-') as variant,
         bool_or(type = 'start') as st,
         coalesce(max(n) filter (where type = 'question_n'), 0) as maxq,
         bool_or(type = 'complete') as c,
         bool_or(type = 'email_view') as ev,
         bool_or(type = 'email_submit') as es,
         bool_or(type = 'optin') as oi,
         bool_or(type = 'share') as sh,
         bool_or(type = 'invite_click') as ic,
         bool_or(type = 'invite_landing') as il
  from public.tracking_events group by session_id
)
select day, variant,
       count(*) filter (where st)        as starts,
       count(*) filter (where maxq >= 5)  as q5,
       count(*) filter (where maxq >= 10) as q10,
       count(*) filter (where maxq >= 20) as q20,
       count(*) filter (where c)         as completes,
       count(*) filter (where ev)        as email_views,
       count(*) filter (where es)        as email_submits,
       count(*) filter (where oi)        as optins,
       count(*) filter (where sh)        as shares,
       count(*) filter (where ic)        as invite_clicks,
       count(*) filter (where il and st) as invite_starts
from s group by day, variant;
revoke all on public.funnel_daily from public, anon, authenticated;

create or replace function public.cc_admin_funnel(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin(p_token);
  return coalesce((select jsonb_agg(to_jsonb(f) order by f.day desc, f.variant)
                   from public.funnel_daily f where f.day > now() - interval '60 days'), '[]'::jsonb);
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.cc_log_event(jsonb)', 'public.cc_admin_funnel(text)'] loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;
end $$;
