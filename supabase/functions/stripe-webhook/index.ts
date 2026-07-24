// ============================================================
// OSPITELY — Edge Function: stripe-webhook
// Path di deploy: supabase/functions/stripe-webhook/index.ts
//
// Riceve gli eventi Stripe e aggiorna Supabase di conseguenza:
// - checkout.session.completed (tipo_checkout: 'registrazione') →
//   crea host + prima struttura
// - checkout.session.completed (tipo_checkout: 'nuova_struttura') →
//   host già esistente, aggiunge solo una struttura in più
// - customer.subscription.deleted / invoice.payment_failed → sospende
// - invoice.paid (rinnovo) → riattiva se era sospeso
//
// LIMITE NOTO: l'idempotenza sul flusso "nuova_struttura" si basa su
// host_id + nome_struttura — se lo stesso host crea davvero due
// strutture con nome identico, la seconda verrebbe scartata per errore
// (scambiata per un evento webhook duplicato). Caso raro, ma se diventa
// un problema reale va sostituito con una chiave di idempotenza dedicata
// (es. l'ID della sessione Stripe salvato da qualche parte).
// ============================================================

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SLUG_RISERVATI = [
  'login', 'dashboard', 'admin', 'api', 'app', 'chat',
  'pricing', 'about', 'signup', 'register', 'logout',
  'settings', 'account', 'help', 'support', 'terms', 'privacy', 'cookie',
];

Deno.serve(async (req) => {
  const firma = req.headers.get('stripe-signature');
  const corpoGrezzo = await req.text();

  let evento: Stripe.Event;
  try {
    // Verifica obbligatoria: senza questo controllo, chiunque potrebbe
    // inviare finte richieste "pagamento completato" a questo endpoint
    evento = await stripe.webhooks.constructEventAsync(corpoGrezzo, firma!, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Firma webhook non valida:', err);
    return new Response('Firma non valida', { status: 400 });
  }

  try {
    switch (evento.type) {
      case 'checkout.session.completed':
        await gestisciCheckoutCompletato(evento.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.deleted':
        await sospendiHostDaSubscription(evento.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await sospendiHostDaCustomerId((evento.data.object as Stripe.Invoice).customer as string);
        break;

      case 'invoice.paid':
        await riattivaHostDaCustomerId((evento.data.object as Stripe.Invoice).customer as string);
        break;

      default:
        // Eventi non gestiti esplicitamente: ignorati senza errore
        break;
    }

    return new Response(JSON.stringify({ ricevuto: true }), { status: 200 });
  } catch (err) {
    console.error(`Errore gestendo evento ${evento.type}:`, err);
    // 500 così Stripe ritenta automaticamente l'invio più tardi
    return new Response('Errore interno', { status: 500 });
  }
});

// ============================================================
// checkout.session.completed → crea host + prima struttura
// ============================================================
async function gestisciCheckoutCompletato(sessione: Stripe.Checkout.Session) {
  const meta = sessione.metadata;

  if (meta?.tipo_checkout === 'nuova_struttura') {
    await gestisciNuovaStruttura(sessione);
    return;
  }

  await gestisciRegistrazione(sessione);
}

// ============================================================
// tipo_checkout: 'nuova_struttura' → host già esistente, aggiunge
// solo una struttura in più (nessuna creazione di host/utente Auth)
// ============================================================
async function gestisciNuovaStruttura(sessione: Stripe.Checkout.Session) {
  const meta = sessione.metadata!;
  if (!meta.host_id || !meta.nome_struttura) {
    console.error('Metadata mancanti per nuova struttura', sessione.id);
    return;
  }

  // Evita doppioni sullo stesso evento ripetuto
  const { data: giaCreata } = await supabase
    .from('properties')
    .select('id')
    .eq('host_id', meta.host_id)
    .eq('nome_struttura', meta.nome_struttura)
    .maybeSingle();
  if (giaCreata) return;

  const slug = await generaSlugUnivoco(meta.nome_struttura);

  const { error: erroreProperty } = await supabase.from('properties').insert({
    host_id: meta.host_id,
    nome_struttura: meta.nome_struttura,
    slug,
    tipo_struttura: meta.tipo_struttura,
    indirizzo: '',
    numero_camere: Number(meta.numero_camere),
  });
  if (erroreProperty) throw erroreProperty;

  // Incrementa il contatore strutture consentite per questo host
  const { data: host } = await supabase.from('hosts').select('max_properties').eq('id', meta.host_id).single();
  await supabase.from('hosts')
    .update({ max_properties: (host?.max_properties ?? 1) + 1, is_multi_struttura: true })
    .eq('id', meta.host_id);
}

// ============================================================
// tipo_checkout: 'registrazione' (o assente, per compatibilità) →
// crea host + prima struttura
// ============================================================
async function gestisciRegistrazione(sessione: Stripe.Checkout.Session) {
  const meta = sessione.metadata;
  if (!meta?.nome || !meta?.nome_struttura) {
    console.error('Metadata mancanti sulla sessione Stripe, impossibile creare host/struttura', sessione.id);
    return;
  }

  const email = sessione.customer_email ?? sessione.customer_details?.email;
  if (!email) {
    console.error('Email mancante sulla sessione Stripe', sessione.id);
    return;
  }

  // Evita doppioni se Stripe invia lo stesso evento più di una volta
  // (garanzia "at-least-once" dei webhook, non "exactly-once")
  const { data: hostEsistente } = await supabase
    .from('hosts')
    .select('id')
    .eq('stripe_customer_id', sessione.customer as string)
    .maybeSingle();
  if (hostEsistente) return;

  // 1. Crea l'utente Auth — invia in automatico l'email di conferma/accesso
  // (passa dallo stesso SMTP Resend già configurato in Supabase Auth)
  const { data: nuovoUtente, error: erroreAuth } = await supabase.auth.admin.inviteUserByEmail(email);
  if (erroreAuth || !nuovoUtente?.user) {
    console.error('Errore creazione utente Auth:', erroreAuth);
    throw erroreAuth ?? new Error('Utente Auth non creato');
  }

  // 2. Crea il record host, con lo stesso id dell'utente Auth (vedi schema)
  const { error: erroreHost } = await supabase.from('hosts').insert({
    id: nuovoUtente.user.id,
    email,
    nome: meta.nome,
    cognome: meta.cognome,
    telefono_whatsapp: meta.telefono_whatsapp,
    max_properties: 1, // prima struttura inclusa nell'abbonamento appena attivato
    stato_abbonamento: 'attivo',
    stripe_customer_id: sessione.customer as string,
    stripe_subscription_id: sessione.subscription as string,
  });
  if (erroreHost) throw erroreHost;

  // 3. Genera uno slug univoco per la prima struttura
  const slug = await generaSlugUnivoco(meta.nome_struttura);

  // 4. Crea la prima struttura
  const { error: erroreProperty } = await supabase.from('properties').insert({
    host_id: nuovoUtente.user.id,
    nome_struttura: meta.nome_struttura,
    slug,
    tipo_struttura: meta.tipo_struttura,
    indirizzo: '', // completato dall'host in fase di onboarding (Profilo struttura)
    numero_camere: Number(meta.numero_camere),
  });
  if (erroreProperty) throw erroreProperty;
}

// ============================================================
// Sospensione / riattivazione abbonamento
// ============================================================
async function sospendiHostDaSubscription(subscription: Stripe.Subscription) {
  await aggiornaStatoDaCustomerId(subscription.customer as string, 'sospeso');
}

async function sospendiHostDaCustomerId(customerId: string) {
  await aggiornaStatoDaCustomerId(customerId, 'sospeso');
}

async function riattivaHostDaCustomerId(customerId: string) {
  await aggiornaStatoDaCustomerId(customerId, 'attivo');
}

async function aggiornaStatoDaCustomerId(customerId: string, stato: 'attivo' | 'sospeso') {
  const { data: host, error } = await supabase
    .from('hosts')
    .update({ stato_abbonamento: stato })
    .eq('stripe_customer_id', customerId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!host) return; // evento per un customer non ancora presente (es. race condition), ignorato

  // Sospendere l'host blocca anche l'accesso alle sue strutture (chat/QR),
  // riattivarlo le riporta disponibili
  await supabase.from('properties').update({ attiva: stato === 'attivo' }).eq('host_id', host.id);
}

// ============================================================
// Generazione slug (stessa logica di ospitely-slug.js, versione server)
// ============================================================
function normalizzaSlug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function generaSlugUnivoco(nomeStruttura: string): Promise<string> {
  const base = normalizzaSlug(nomeStruttura);
  let candidato = base;
  let tentativo = 1;

  while (true) {
    const nonDisponibile = SLUG_RISERVATI.includes(candidato);
    const { count } = nonDisponibile
      ? { count: 1 }
      : await supabase.from('properties').select('id', { count: 'exact', head: true }).eq('slug', candidato);

    if (!count) return candidato;

    tentativo += 1;
    candidato = `${base}-${tentativo}`;
  }
}
