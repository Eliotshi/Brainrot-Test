-- ============================================================
-- Lot 4 · Lien permanent du rapport (/r/{token})
-- Additive : nouvelle colonne avec valeur par défaut (les résultats existants
-- reçoivent chacun un jeton), nouvelle fonction de lecture publique restreinte.
-- ============================================================

-- jeton url-safe de 24 caractères (18 octets aléatoires), non devinable
alter table public.results
  add column if not exists report_token text not null
  default replace(replace(rtrim(encode(extensions.gen_random_bytes(18), 'base64'), '='), '+', '-'), '/', '_');
create unique index if not exists results_report_token_idx on public.results (report_token);

-- Lecture du rapport par son jeton : uniquement ce qui sert à ré-afficher le rapport.
-- Jamais l'e-mail, jamais les réponses de qualification, jamais les UTM.
create or replace function public.cc_get_report(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'created_at', r.created_at, 'profile', r.profile, 'age', r.age, 'mode', r.mode,
    'n_questions', r.n_questions, 'overall', r.overall, 'temp', r.temp, 'level', r.level,
    'archetype', r.archetype, 'scores', r.scores, 'answers', r.answers, 'badges', r.badges, 'xp', r.xp)
  from public.results r
  where p_token ~ '^[A-Za-z0-9_-]{22,40}$' and r.report_token = p_token;
$$;

revoke execute on function public.cc_get_report(text) from public;
grant execute on function public.cc_get_report(text) to anon, authenticated, service_role;
