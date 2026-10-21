-- ============================================================
-- Lot 3 · Socle légal : tranches d'âge mineurs, registre des consentements
-- Additive : on élargit la contrainte d'âge, on ajoute une table et des fonctions.
-- ============================================================

-- 1. Tranches d'âge : moins de 15 ans et 15–17 ans
alter table public.results drop constraint if exists results_age_check;
alter table public.results add constraint results_age_check
  check (age in ('<15', '15-17', '18-24', '25-34', '35-44', '45+'));

-- 2. Registre des consentements : une ligne par case, cochée ou non, à chaque soumission
create table if not exists public.consents (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  lead_id       uuid not null references public.leads(id) on delete cascade,
  purpose       text not null check (purpose in ('report', 'newsletter', 'partners', 'duel_notify', 'show_name')),
  granted       boolean not null,
  text_version  text not null,
  text_snapshot text not null,
  source        text,
  age_band      text,
  withdrawn_at  timestamptz
);
create index if not exists consents_lead_idx on public.consents (lead_id, purpose, created_at desc);
alter table public.consents enable row level security;
revoke all on public.consents from anon, authenticated;

-- Enregistre les consentements d'une soumission (textes fournis par le serveur, jamais par le navigateur).
-- p = { source, age_band, text_version, items: [{ purpose, granted, text }] }
-- consent_marketing passe à vrai si la newsletter est cochée ; une case vide ne retire jamais un opt-in.
create or replace function public.cc_record_consents(p_email text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare lid uuid; it jsonb;
begin
  select id into lid from public.leads where email = lower(trim(p_email));
  if lid is null then raise exception 'unknown_lead'; end if;
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') > 5 then raise exception 'invalid_items'; end if;
  for it in select * from jsonb_array_elements(p->'items') loop
    insert into public.consents (lead_id, purpose, granted, text_version, text_snapshot, source, age_band)
    values (lid, it->>'purpose', coalesce((it->>'granted')::boolean, false), left(p->>'text_version', 40),
            left(it->>'text', 1000), left(p->>'source', 20), left(p->>'age_band', 8));
    if it->>'purpose' = 'newsletter' and (it->>'granted')::boolean then
      update public.leads set consent_marketing = true where id = lid;
    end if;
  end loop;
end $$;

-- 3. Mineurs : aucun lead lié à un résultat « moins de 15 ans » (défense en profondeur, /api/lead refuse déjà)
create or replace function public.cc_assert_not_minor(p_result_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.results where id = p_result_id and age = '<15') then
    raise exception 'minor_no_collect' using errcode = '42501';
  end if;
end $$;

-- 4. Désinscription : pose aussi withdrawn_at sur les consentements marketing actifs
create or replace function public.cc_unsubscribe(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.leads set consent_marketing = false, unsubscribed_at = now() where id = p_id;
  if not found then return false; end if;
  update public.consents set withdrawn_at = now()
  where lead_id = p_id and purpose in ('newsletter', 'partners') and granted and withdrawn_at is null;
  return true;
end $$;

create or replace function public.cc_admin_unsubscribe(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform private.assert_admin(p_token);
  update public.leads l set consent_marketing = false, unsubscribed_at = now()
  where l.id = p_id returning to_jsonb(l) into r;
  update public.consents set withdrawn_at = now()
  where lead_id = p_id and purpose in ('newsletter', 'partners') and granted and withdrawn_at is null;
  return r;
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.cc_record_consents(text, jsonb)', 'public.cc_assert_not_minor(uuid)'] loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;
end $$;
