-- ============================================================
-- Cerveau Cramé · API par fonctions (clé publishable côté serveur)
-- Les tables restent fermées (RLS sans policy). Tout passe par ces
-- fonctions SECURITY DEFINER, qui n'exposent que ce qui est nécessaire.
-- Le CRM est protégé par un jeton serveur (ADMIN_RPC_TOKEN sur Vercel),
-- dont seul le hash SHA-256 est stocké dans private.app_config.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.app_config (key text primary key, value text not null);

create or replace function private.assert_admin(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare h text;
begin
  select value into h from private.app_config where key = 'admin_token_sha256';
  if h is null or p_token is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> h then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
end $$;

-- ---------- résultats ----------
create or replace function public.cc_save_result(p jsonb, p_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if pg_column_size(p) > 32768 then raise exception 'payload_too_large'; end if;
  if jsonb_typeof(p->'scores') is distinct from 'object' then raise exception 'invalid_scores'; end if;
  if p_id is not null then
    update public.results set
      profile = p->>'profile', age = p->>'age', mode = p->>'mode',
      n_questions = (p->>'n_questions')::int, overall = (p->>'overall')::numeric,
      temp = (p->>'temp')::numeric, level = left(p->>'level', 20), archetype = left(p->>'archetype', 20),
      scores = p->'scores', answers = p->'answers', qual = p->'qual',
      badges = array(select left(x, 12) from jsonb_array_elements_text(coalesce(p->'badges', '[]'::jsonb)) x limit 20),
      xp = (p->>'xp')::int, duration_s = (p->>'duration_s')::int
    where id = p_id returning id into rid;
    if rid is not null then return rid; end if;
  end if;
  insert into public.results (profile, age, mode, n_questions, overall, temp, level, archetype,
                              scores, answers, qual, badges, xp, duration_s, utm)
  values (p->>'profile', p->>'age', p->>'mode', (p->>'n_questions')::int, (p->>'overall')::numeric,
          (p->>'temp')::numeric, left(p->>'level', 20), left(p->>'archetype', 20),
          p->'scores', p->'answers', p->'qual',
          array(select left(x, 12) from jsonb_array_elements_text(coalesce(p->'badges', '[]'::jsonb)) x limit 20),
          (p->>'xp')::int, (p->>'duration_s')::int, p->'utm')
  returning id into rid;
  return rid;
end $$;

-- un résultat (par son uuid) + les drapeaux du lead lié, sans e-mail
create or replace function public.cc_get_result(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(r) || jsonb_build_object('lead', (
    select jsonb_build_object('id', l.id, 'consent_marketing', l.consent_marketing,
                              'offer_clicked', l.offer_clicked, 'shared', l.shared)
    from public.leads l where l.result_id = r.id limit 1))
  from public.results r where r.id = p_id;
$$;

create or replace function public.cc_add_event(rid uuid, ev text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if ev not in ('offer_click', 'share', 'extended') then raise exception 'invalid_event'; end if;
  update public.results set events = array(select distinct unnest(events || ev)) where id = rid;
end $$;

-- ---------- leads ----------
create or replace function public.cc_upsert_lead(p_email text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(p_email));
begin
  if e !~ '^[^[:space:]@]{1,64}@[^[:space:]@]+\.[^[:space:]@]{2,}$' or length(e) > 160 then
    raise exception 'invalid_email';
  end if;
  insert into public.leads as l (
    email, first_name, result_id, consent_marketing, profile, age, mode, situation, spend, payer, wish,
    overall, temp, level, archetype, top_axes, buying_power, motivation, segment,
    incentive, incentive_label, incentive_reason, offer_clicked, shared, extended, utm)
  values (
    e, nullif(left(p->>'first_name', 60), ''), (p->>'result_id')::uuid, coalesce((p->>'consent_marketing')::boolean, false),
    p->>'profile', p->>'age', p->>'mode', p->>'situation', p->>'spend', p->>'payer', (p->>'wish')::int,
    (p->>'overall')::numeric, (p->>'temp')::numeric, left(p->>'level', 20), left(p->>'archetype', 20),
    case when jsonb_typeof(p->'top_axes') = 'array' then array(select jsonb_array_elements_text(p->'top_axes')) end,
    (p->>'buying_power')::int, (p->>'motivation')::int, p->>'segment',
    left(p->>'incentive', 40), left(p->>'incentive_label', 80), left(p->>'incentive_reason', 300),
    coalesce((p->>'offer_clicked')::boolean, false), coalesce((p->>'shared')::boolean, false),
    coalesce((p->>'extended')::boolean, false), p->'utm')
  on conflict (email) do update set
    first_name        = coalesce(excluded.first_name, l.first_name),
    result_id         = coalesce(excluded.result_id, l.result_id),
    consent_marketing = l.consent_marketing or excluded.consent_marketing,  -- un opt-in n'est jamais retiré
    profile = coalesce(excluded.profile, l.profile), age = coalesce(excluded.age, l.age), mode = coalesce(excluded.mode, l.mode),
    situation = coalesce(excluded.situation, l.situation), spend = coalesce(excluded.spend, l.spend),
    payer = coalesce(excluded.payer, l.payer), wish = coalesce(excluded.wish, l.wish),
    overall = coalesce(excluded.overall, l.overall), temp = coalesce(excluded.temp, l.temp),
    level = coalesce(excluded.level, l.level), archetype = coalesce(excluded.archetype, l.archetype),
    top_axes = coalesce(excluded.top_axes, l.top_axes),
    buying_power = coalesce(excluded.buying_power, l.buying_power), motivation = coalesce(excluded.motivation, l.motivation),
    segment = coalesce(excluded.segment, l.segment), incentive = coalesce(excluded.incentive, l.incentive),
    incentive_label = coalesce(excluded.incentive_label, l.incentive_label),
    incentive_reason = coalesce(excluded.incentive_reason, l.incentive_reason),
    offer_clicked = l.offer_clicked or excluded.offer_clicked, shared = l.shared or excluded.shared,
    extended = l.extended or excluded.extended,
    attempts = l.attempts + 1;
end $$;

-- recalcul du scoring du lead lié à un résultat (événement, passage en mode complet)
create or replace function public.cc_update_lead_by_result(p_result_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.leads set
    mode = coalesce(p->>'mode', mode), overall = coalesce((p->>'overall')::numeric, overall),
    temp = coalesce((p->>'temp')::numeric, temp), level = coalesce(left(p->>'level', 20), level),
    archetype = coalesce(left(p->>'archetype', 20), archetype),
    top_axes = case when jsonb_typeof(p->'top_axes') = 'array' then array(select jsonb_array_elements_text(p->'top_axes')) else top_axes end,
    buying_power = coalesce((p->>'buying_power')::int, buying_power), motivation = coalesce((p->>'motivation')::int, motivation),
    segment = coalesce(p->>'segment', segment), incentive = coalesce(left(p->>'incentive', 40), incentive),
    incentive_label = coalesce(left(p->>'incentive_label', 80), incentive_label),
    incentive_reason = coalesce(left(p->>'incentive_reason', 300), incentive_reason),
    offer_clicked = offer_clicked or coalesce((p->>'offer_clicked')::boolean, false),
    shared = shared or coalesce((p->>'shared')::boolean, false),
    extended = extended or coalesce((p->>'extended')::boolean, false)
  where result_id = p_result_id;
end $$;

-- ---------- CRM (jeton serveur obligatoire) ----------
create or replace function public.cc_admin_list(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin(p_token);
  return jsonb_build_object(
    'leads', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at desc)
                       from (select * from public.leads order by created_at desc limit 5000) l), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'results', (select count(*) from public.results),
      'offerClicks', (select count(*) from public.results where 'offer_click' = any(events)),
      'shares', (select count(*) from public.results where 'share' = any(events))));
end $$;

create or replace function public.cc_admin_update(p_token text, p_id uuid, p_status text default null, p_notes text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform private.assert_admin(p_token);
  update public.leads l set status = coalesce(p_status, l.status), notes = coalesce(left(p_notes, 4000), l.notes)
  where l.id = p_id returning to_jsonb(l) into r;
  return r;
end $$;

-- ---------- droits ----------
drop function if exists public.add_result_event(uuid, text);
revoke execute on all functions in schema private from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.cc_save_result(jsonb, uuid)', 'public.cc_get_result(uuid)', 'public.cc_add_event(uuid, text)',
    'public.cc_upsert_lead(text, jsonb)', 'public.cc_update_lead_by_result(uuid, jsonb)',
    'public.cc_admin_list(text)', 'public.cc_admin_update(text, uuid, text, text)', 'public.panel_stats()']
  loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;
end $$;

-- panel_stats lit les résultats agrégés pour la clé publishable
alter function public.panel_stats() security definer;
