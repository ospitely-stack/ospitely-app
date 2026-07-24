-- ============================================================
-- OSPITELY — Schema Supabase (PostgreSQL)
-- Da eseguire nell'SQL Editor di Supabase, in un'unica passata.
-- ============================================================

-- Estensione per generare UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. HOSTS
-- id = stesso UUID dell'utente in auth.users (Supabase Auth,
-- magic link) — evita una tabella di mapping separata e rende
-- le policy RLS più semplici (auth.uid() = hosts.id)
-- ============================================================
create table hosts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nome text not null,
  cognome text not null,
  telefono_whatsapp text not null,
  is_multi_struttura boolean not null default false,
  max_properties int not null default 1,
  stato_abbonamento text not null default 'attivo'
    check (stato_abbonamento in ('attivo', 'sospeso', 'scaduto', 'gratuito')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  lingua_default text not null default 'it',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table hosts is 'Host che pagano l''abbonamento e gestiscono una o più strutture';
comment on column hosts.max_properties is 'Aggiornato in automatico dalla Edge Function webhook Stripe';

-- ============================================================
-- 2. PROPERTIES
-- Relazione 1-a-molti con hosts: un host può avere più strutture
-- ============================================================
create table properties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  nome_struttura text not null,
  slug text not null unique,
  tipo_struttura text not null
    check (tipo_struttura in ('hotel', 'b&b', 'affittacamere', 'affitto_turistico', 'casa_vacanze')),
  indirizzo text not null,
  piano_interno_citofono text,
  numero_camere int not null check (numero_camere > 0),
  attiva boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Formato slug valido: minuscolo, numeri, trattini singoli, no trattino iniziale/finale
  constraint slug_formato_valido check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- Parole riservate: non possono essere usate come slug struttura
  constraint slug_non_riservato check (
    slug not in (
      'login', 'dashboard', 'admin', 'api', 'app', 'chat',
      'pricing', 'about', 'signup', 'register', 'logout',
      'settings', 'account', 'help', 'support', 'terms', 'privacy', 'cookie'
    )
  )
);

comment on column properties.slug is 'Usato nel link pubblico ospitely.com/slug — univoco globale, non solo per host';
comment on column properties.numero_camere is 'Dichiarato dall''host, verificato in fase di setup — usato per il controllo capacità sui codici soggiorno';

create index idx_properties_host_id on properties(host_id);
create index idx_properties_slug on properties(slug);

-- ============================================================
-- 3. PROPERTY_PROFILE
-- Relazione 1-a-1 con properties — il "cervello" passato come
-- contesto system all'API Claude
-- ============================================================
create table property_profile (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references properties(id) on delete cascade,

  -- Check-in / Check-out
  checkin_orario_da time,
  checkin_orario_a time,
  checkin_late_disponibile boolean default false,
  checkin_late_a_pagamento boolean default false,
  checkout_orario_da time,
  checkout_orario_a time,
  checkout_late_disponibile boolean default false,
  checkout_late_a_pagamento boolean default false,
  checkin_modalita text
    check (checkin_modalita in ('self_checkin', 'accoglienza_persona', 'altro')),
  istruzioni_accesso text,
  video_istruzioni_url text,

  -- Colazione (rilevante solo se tipo_struttura in hotel/b&b/affittacamere)
  colazione_orario_da time,
  colazione_orario_a time,
  colazione_dove text
    check (colazione_dove in ('sala_interna', 'bar_convenzionato', 'in_camera')),
  colazione_tipo text
    check (colazione_tipo in ('dolce', 'salata', 'internazionale', 'self_service', 'servita', 'self_e_servita')),
  colazione_note text,

  -- WiFi e utenze
  wifi_nome_rete text,
  wifi_password text,
  note_utenze text,

  -- Regole della casa
  orario_silenzio text,
  policy_fumo text,
  policy_animali text,
  policy_ospiti_esterni text,
  altre_regole text,

  -- Contatti ed emergenze
  numero_emergenze text,
  whatsapp_host text,
  contatti_extra jsonb default '[]'::jsonb,
  -- formato: [{"nome": "Medico convenzionato", "contatto": "..."}]

  -- Mezzi e trasporti
  fermata_bus_info text,
  stazione_info text,
  aeroporto_info text,
  parcheggio_info text,

  -- Consigli locali (ripetibili)
  consigli_locali jsonb default '[]'::jsonb,
  -- formato: [{"categoria": "ristorante", "nome": "...", "nota": "economico, tipico"}]

  -- FAQ personalizzate (ripetibili)
  faq jsonb default '[]'::jsonb,
  -- formato: [{"domanda": "...", "risposta": "..."}]

  -- Lingua e tono
  tono_assistente text not null default 'amichevole'
    check (tono_assistente in ('formale', 'amichevole', 'informale')),
  modalita_lingua text not null default 'auto_rilevamento'
    check (modalita_lingua in ('italiano_piu_una', 'auto_rilevamento')),
  lingua_aggiuntiva text,
  -- valorizzato solo se modalita_lingua = 'italiano_piu_una'
  note_traduzione text,

  updated_at timestamptz not null default now()
);

create index idx_property_profile_property_id on property_profile(property_id);

comment on column property_profile.note_traduzione is 'Campo libero facoltativo: istruzioni dell''host per Claude su come tradurre (es. nomi da non tradurre, tono preferito in altre lingue). Non sostituisce mai la regola fissa: nomi propri di locali/attività non si traducono mai, a prescindere da cosa scrive l''host qui.';

-- ============================================================
-- 3B. SOGGIORNI
-- Codice di accesso legato a un soggiorno reale (check-in/check-out).
-- Sostituisce l'accesso "libero" alla chat: senza un codice valido
-- e in corso di validità, la chat non si apre.
-- ============================================================
create table soggiorni (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  codice text not null unique,
  data_checkin date not null,
  data_checkout date not null,
  revocato boolean not null default false,
  contatore_messaggi int not null default 0,
  limite_messaggi int not null default 0,
  created_at timestamptz not null default now(),

  constraint codice_formato check (codice ~ '^[A-Z0-9]{6}$'),
  constraint checkout_dopo_checkin check (data_checkout > data_checkin),
  -- Punto deciso: soggiorni più lunghi richiedono un nuovo codice allo scadere
  constraint durata_massima_7_notti check (data_checkout <= data_checkin + 7)
);

comment on column soggiorni.codice is 'Codice a 6 caratteri comunicato dall''host all''ospite fuori dall''app (a voce, su carta, in un messaggio di conferma)';
comment on column soggiorni.revocato is 'true = host ha chiuso il soggiorno in anticipo (es. ospite partito prima)';
comment on column soggiorni.contatore_messaggi is 'Limite messaggi agganciato al soggiorno (non al device/conversation) — resta corretto anche se l''ospite cancella i dati del browser';
comment on column soggiorni.limite_messaggi is 'Calcolato in automatico alla creazione in base alla durata del soggiorno — vedi trigger imposta_limite_messaggi';

-- Trigger: calcola il tetto messaggi in base alla durata del soggiorno.
-- Formula: 30 messaggi base (copre le domande tipiche del giorno di
-- arrivo: WiFi, accesso, colazione, regole) + 12 per ogni notte aggiuntiva.
-- Costanti facili da cambiare qui se il numero non convince in futuro.
create or replace function imposta_limite_messaggi()
returns trigger as $$
declare
  notti int;
  limite_base int := 30;
  limite_per_notte_aggiuntiva int := 12;
begin
  notti := new.data_checkout - new.data_checkin;
  new.limite_messaggi := limite_base + greatest(notti - 1, 0) * limite_per_notte_aggiuntiva;
  return new;
end;
$$ language plpgsql;

create trigger trg_imposta_limite_messaggi
  before insert or update of data_checkin, data_checkout on soggiorni
  for each row execute function imposta_limite_messaggi();

create index idx_soggiorni_property_id on soggiorni(property_id);
create index idx_soggiorni_codice on soggiorni(codice);

-- Trigger: blocca la creazione/modifica di un soggiorno se le camere
-- dichiarate sono già tutte occupate per le date richieste (controllo
-- per sovrapposizione, non conteggio totale — replica la logica reale
-- di un hotel: una camera = un soggiorno alla volta)
create or replace function check_capacita_soggiorno()
returns trigger as $$
declare
  camere_dichiarate int;
  soggiorni_sovrapposti int;
begin
  select numero_camere into camere_dichiarate
  from properties where id = new.property_id;

  select count(*) into soggiorni_sovrapposti
  from soggiorni
  where property_id = new.property_id
    and revocato = false
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and data_checkin <= new.data_checkout
    and data_checkout >= new.data_checkin;

  if not new.revocato and soggiorni_sovrapposti >= camere_dichiarate then
    raise exception 'Capacità struttura raggiunta per queste date: % soggiorni già attivi su % camere dichiarate', soggiorni_sovrapposti, camere_dichiarate;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_check_capacita_soggiorno
  before insert or update on soggiorni
  for each row execute function check_capacita_soggiorno();

-- ============================================================
-- 3C. SOGGIORNO_DISPOSITIVI
-- Traccia quali dispositivi (device_id anonimo generato dal browser
-- dell'ospite, salvato in locale) hanno usato un dato codice soggiorno.
-- Limite: 2 dispositivi per codice.
-- ============================================================
create table soggiorno_dispositivi (
  id uuid primary key default gen_random_uuid(),
  soggiorno_id uuid not null references soggiorni(id) on delete cascade,
  device_id text not null,
  primo_accesso timestamptz not null default now(),

  unique (soggiorno_id, device_id)
);

create index idx_soggiorno_dispositivi_soggiorno_id on soggiorno_dispositivi(soggiorno_id);

-- ============================================================
-- 3D. TENTATIVI_CODICE_FALLITI
-- Protezione da tentativi ripetuti/automatici di indovinare un codice
-- (brute force). ip_hash invece dell'IP in chiaro per privacy minima.
-- ============================================================
create table tentativi_codice_falliti (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  ip_hash text not null,
  tentato_il timestamptz not null default now()
);

create index idx_tentativi_property_ip on tentativi_codice_falliti(property_id, ip_hash, tentato_il);

-- ============================================================
-- 4. CONVERSATIONS
-- ============================================================
create table conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  lingua_rilevata text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table conversations is 'Il conteggio messaggi/rate limit vive su soggiorni.contatore_messaggi, non qui — resta corretto anche su più conversazioni/dispositivi dello stesso soggiorno';

create index idx_conversations_property_id on conversations(property_id);

-- ============================================================
-- 5. MESSAGES
-- ============================================================
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  ruolo text not null check (ruolo in ('ospite', 'assistente')),
  testo text not null,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation_id on messages(conversation_id);

-- ============================================================
-- 6. ALERTS
-- ============================================================
create table alerts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  tipo text not null check (tipo in ('urgente', 'non_urgente')),
  canale_scelto text not null check (canale_scelto in ('whatsapp', 'sms', 'chiamata')),
  testo text not null,
  letto boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_alerts_property_id on alerts(property_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Regola generale:
-- - Host autenticato (auth.uid()) vede/gestisce solo i propri dati
-- - Le operazioni lato ospite (chat pubblica, invio alert) passano
--   da una Edge Function con service_role, che bypassa la RLS —
--   gli ospiti non hanno mai un account/login
-- ============================================================

alter table hosts enable row level security;
alter table properties enable row level security;
alter table property_profile enable row level security;
alter table soggiorni enable row level security;
alter table soggiorno_dispositivi enable row level security;
alter table tentativi_codice_falliti enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table alerts enable row level security;

-- HOSTS: un host vede/modifica solo il proprio record
create policy "host_select_own" on hosts
  for select using (auth.uid() = id);

create policy "host_update_own" on hosts
  for update using (auth.uid() = id);

-- SOGGIORNI: host crea/vede/aggiorna (es. revoca) solo i soggiorni delle proprie strutture
create policy "soggiorni_select_own" on soggiorni
  for select using (
    exists (
      select 1 from properties
      where properties.id = soggiorni.property_id
      and properties.host_id = auth.uid()
    )
  );

create policy "soggiorni_insert_own" on soggiorni
  for insert with check (
    exists (
      select 1 from properties
      where properties.id = soggiorni.property_id
      and properties.host_id = auth.uid()
    )
  );

create policy "soggiorni_update_own" on soggiorni
  for update using (
    exists (
      select 1 from properties
      where properties.id = soggiorni.property_id
      and properties.host_id = auth.uid()
    )
  );

-- SOGGIORNO_DISPOSITIVI: nessuna policy di insert pubblica — la scrittura
-- avviene solo dalla Edge Function con service_role. L'host può però
-- consultare lo storico dispositivi dei propri soggiorni in dashboard.
create policy "soggiorno_dispositivi_select_own" on soggiorno_dispositivi
  for select using (
    exists (
      select 1 from soggiorni
      join properties on properties.id = soggiorni.property_id
      where soggiorni.id = soggiorno_dispositivi.soggiorno_id
      and properties.host_id = auth.uid()
    )
  );

-- TENTATIVI_CODICE_FALLITI: nessuna policy pubblica, tabella di servizio
-- gestita solo dalla Edge Function (service_role) per il rate limiting.

-- PROPERTIES: host gestisce solo le proprie strutture
create policy "properties_select_own" on properties
  for select using (auth.uid() = host_id);

create policy "properties_insert_own" on properties
  for insert with check (auth.uid() = host_id);

create policy "properties_update_own" on properties
  for update using (auth.uid() = host_id);

create policy "properties_delete_own" on properties
  for delete using (auth.uid() = host_id);

-- Lettura pubblica minima per la chat ospite: solo slug/nome/tipo,
-- non dati sensibili — meglio comunque passare da una view dedicata
-- o da una Edge Function invece di esporre select pubblico diretto.

-- PROPERTY_PROFILE: host vede/modifica solo il profilo delle proprie strutture
create policy "profile_select_own" on property_profile
  for select using (
    exists (
      select 1 from properties
      where properties.id = property_profile.property_id
      and properties.host_id = auth.uid()
    )
  );

create policy "profile_insert_own" on property_profile
  for insert with check (
    exists (
      select 1 from properties
      where properties.id = property_profile.property_id
      and properties.host_id = auth.uid()
    )
  );

create policy "profile_update_own" on property_profile
  for update using (
    exists (
      select 1 from properties
      where properties.id = property_profile.property_id
      and properties.host_id = auth.uid()
    )
  );

-- CONVERSATIONS: host vede solo le conversazioni delle proprie strutture
create policy "conversations_select_own" on conversations
  for select using (
    exists (
      select 1 from properties
      where properties.id = conversations.property_id
      and properties.host_id = auth.uid()
    )
  );

-- MESSAGES: host vede solo i messaggi delle proprie conversazioni
create policy "messages_select_own" on messages
  for select using (
    exists (
      select 1 from conversations
      join properties on properties.id = conversations.property_id
      where conversations.id = messages.conversation_id
      and properties.host_id = auth.uid()
    )
  );

-- ALERTS: host vede/aggiorna (segna come letto) solo gli alert delle proprie strutture
create policy "alerts_select_own" on alerts
  for select using (
    exists (
      select 1 from properties
      where properties.id = alerts.property_id
      and properties.host_id = auth.uid()
    )
  );

create policy "alerts_update_own" on alerts
  for update using (
    exists (
      select 1 from properties
      where properties.id = alerts.property_id
      and properties.host_id = auth.uid()
    )
  );

-- Nota: insert su conversations/messages/alerts lato ospite avviene
-- tramite Edge Function con service_role key (bypassa RLS) — non
-- servono qui policy di insert pubbliche, evitando che chiunque
-- possa scrivere direttamente sul database dal client.

-- ============================================================
-- TRIGGER: aggiorna updated_at automaticamente
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_hosts_updated_at
  before update on hosts
  for each row execute function set_updated_at();

create trigger trg_properties_updated_at
  before update on properties
  for each row execute function set_updated_at();

create trigger trg_property_profile_updated_at
  before update on property_profile
  for each row execute function set_updated_at();

create trigger trg_conversations_updated_at
  before update on conversations
  for each row execute function set_updated_at();
