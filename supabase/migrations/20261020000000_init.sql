-- ============================================================
-- Cerveau Cramé · schéma initial
-- Toutes les écritures passent par les routes /api (clé secrète
-- côté serveur). Le navigateur n'a jamais accès direct aux tables.
-- ============================================================

create table if not exists public.results (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  profile      text not null check (profile in ('etu','pro')),
  age          text not null check (age in ('18-24','25-34','35-44','45+')),
  mode         text not null check (mode in ('express','complet','complet+')),
  n_questions  int  not null check (n_questions between 1 and 60),
  overall      numeric(5,1) not null check (overall between 0 and 100),
  temp         numeric(4,1),
  level        text,
  archetype    text,
  scores       jsonb not null,
  answers      jsonb,
  qual         jsonb,
  badges       text[],
  xp           int,
  duration_s   int,
  utm          jsonb,
  events       text[] not null default '{}'
);
create index if not exists results_group_idx on public.results (profile, age);
create index if not exists results_created_idx on public.results (created_at desc);

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  email             text not null unique check (email = lower(email) and length(email) <= 160),
  first_name        text check (length(first_name) <= 60),
  result_id         uuid references public.results(id) on delete set null,
  consent_marketing boolean not null default false,
  profile           text,
  age               text,
  mode              text,
  -- chapitre bonus « plan de sauvetage »
  situation         text,
  spend             text,
  payer             text,
  wish              int check (wish between 0 and 10),
  -- résultat
  overall           numeric(5,1),
  temp              numeric(4,1),
  level             text,
  archetype         text,
  top_axes          text[],
  -- scoring CRM (calculé par lib/scoring.js)
  buying_power      int,
  motivation        int,
  segment           text check (segment in ('pret','a_convaincre','motive_sans_budget','froid')),
  incentive         text,
  incentive_label   text,
  incentive_reason  text,
  -- comportement
  offer_clicked     boolean not null default false,
  shared            boolean not null default false,
  extended          boolean not null default false,
  attempts          int not null default 1,
  -- pipeline
  status            text not null default 'nouveau'
                    check (status in ('nouveau','contacte','en_discussion','converti','perdu')),
  notes             text check (length(notes) <= 4000),
  utm               jsonb
);
create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_result_idx on public.leads (result_id);
create index if not exists leads_segment_idx on public.leads (segment, status);

-- updated_at automatique
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists results_touch on public.results;
create trigger results_touch before update on public.results for each row execute function public.touch_updated_at();
drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();

-- Verrouillage : RLS activé sans aucune policy = aucun accès anon/authenticated.
alter table public.results enable row level security;
alter table public.leads   enable row level security;
revoke all on public.results, public.leads from anon, authenticated;

-- Statistiques agrégées (jamais de ligne individuelle) pour les comparaisons.
create or replace function public.panel_stats() returns jsonb
language sql stable set search_path = '' as $$
with r as (
  select profile, age, overall, archetype, scores
  from public.results where n_questions >= 15
),
long as (
  select r.profile, r.age, k, (r.scores->>k)::numeric as v
  from r cross join unnest(array['plume','pensee','memoire','boussole','attention','idees','coeur','perroquet']) as k
),
g  as (select profile||'|'||age as key, k, avg(v) m, stddev_samp(v) sd from long group by 1,2),
p  as (select profile as key, k, avg(v) m, stddev_samp(v) sd from long group by 1,2),
a  as (select k, avg(v) m, stddev_samp(v) sd from long group by 1),
go as (select profile||'|'||age as key, count(*) n, avg(overall) o, stddev_samp(overall) osd from r group by 1),
po as (select profile as key, count(*) n, avg(overall) o, stddev_samp(overall) osd from r group by 1)
select jsonb_build_object(
  'n_total', (select count(*) from public.results),
  'groups', coalesce((select jsonb_object_agg(go.key, jsonb_build_object(
      'n', go.n, 'overall', round(go.o,1), 'overall_sd', round(coalesce(go.osd,14),1),
      'means', (select jsonb_object_agg(g.k, round(g.m,1)) from g where g.key = go.key),
      'sds',   (select jsonb_object_agg(g.k, round(coalesce(g.sd,20),1)) from g where g.key = go.key)
    )) from go), '{}'::jsonb),
  'profiles', coalesce((select jsonb_object_agg(po.key, jsonb_build_object(
      'n', po.n, 'overall', round(po.o,1), 'overall_sd', round(coalesce(po.osd,14),1),
      'means', (select jsonb_object_agg(p.k, round(p.m,1)) from p where p.key = po.key),
      'sds',   (select jsonb_object_agg(p.k, round(coalesce(p.sd,20),1)) from p where p.key = po.key)
    )) from po), '{}'::jsonb),
  'all', (select jsonb_build_object(
      'n', count(*), 'overall', round(avg(overall),1), 'overall_sd', round(coalesce(stddev_samp(overall),14),1),
      'means', (select jsonb_object_agg(a.k, round(a.m,1)) from a),
      'sds',   (select jsonb_object_agg(a.k, round(coalesce(a.sd,20),1)) from a)
    ) from r),
  'archetypes', coalesce((select jsonb_object_agg(archetype, c) from (select archetype, count(*) c from r group by 1) x), '{}'::jsonb)
);
$$;
revoke execute on function public.panel_stats() from public, anon, authenticated;
grant execute on function public.panel_stats() to service_role;

-- Ajout atomique d'un événement (offer_click, share, extended)
create or replace function public.add_result_event(rid uuid, ev text) returns void
language sql set search_path = '' as $$
  update public.results set events = array(select distinct unnest(events || ev)) where id = rid;
$$;
revoke execute on function public.add_result_event(uuid, text) from public, anon, authenticated;
grant execute on function public.add_result_event(uuid, text) to service_role;
