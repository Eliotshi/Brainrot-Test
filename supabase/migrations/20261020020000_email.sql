-- ============================================================
-- Cerveau Cramé · e-mails de résultats
-- - plafonds d'envoi (anti-abus + limite Gmail ~500/jour)
-- - désinscription en un clic (lien signé côté serveur)
-- ============================================================

alter table public.leads
  add column if not exists emails_sent     int not null default 0,
  add column if not exists last_email_at   timestamptz,
  add column if not exists unsubscribed_at timestamptz;

create table if not exists private.mail_log (
  id      bigserial primary key,
  lead_id uuid,
  sent_at timestamptz not null default now()
);
create index if not exists mail_log_sent_idx on private.mail_log (sent_at);
create index if not exists mail_log_lead_idx on private.mail_log (lead_id, sent_at);

-- Réserve un envoi pour cette adresse. Renvoie l'id du lead, ou null si un plafond est atteint :
-- 1 e-mail toutes les 3 minutes et 5 par 24 h par adresse, 450 par 24 h au total.
create or replace function public.cc_claim_email(p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare lid uuid;
begin
  if (select count(*) from private.mail_log where sent_at > now() - interval '24 hours') >= 450 then
    return null;
  end if;
  update public.leads l set emails_sent = l.emails_sent + 1, last_email_at = now()
  where l.email = lower(trim(p_email))
    and (l.last_email_at is null or l.last_email_at < now() - interval '3 minutes')
    and (select count(*) from private.mail_log m where m.lead_id = l.id and m.sent_at > now() - interval '24 hours') < 5
  returning l.id into lid;
  if lid is not null then insert into private.mail_log (lead_id) values (lid); end if;
  return lid;
end $$;

-- Désinscription (le lien est signé et vérifié par /api/unsubscribe avant l'appel)
create or replace function public.cc_unsubscribe(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.leads set consent_marketing = false, unsubscribed_at = now() where id = p_id;
  return found;
end $$;

-- Retrait de l'opt-in depuis le CRM (réponse « STOP » reçue par e-mail)
create or replace function public.cc_admin_unsubscribe(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform private.assert_admin(p_token);
  update public.leads l set consent_marketing = false, unsubscribed_at = now()
  where l.id = p_id returning to_jsonb(l) into r;
  return r;
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.cc_claim_email(text)', 'public.cc_unsubscribe(uuid)', 'public.cc_admin_unsubscribe(text, uuid)']
  loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;
end $$;
