// ============================================================
// OSPITELY — Edge Function: crea-checkout-nuova-struttura
// Path di deploy: supabase/functions/crea-checkout-nuova-struttura/index.ts
//
// A differenza di crea-checkout-registrazione, qui il chiamante è già
// un host autenticato che vuole aggiungere una struttura ulteriore.
// Applica lo sconto multi-struttura (15%) tramite un coupon Stripe
// creato una tantum sul dashboard.
//
// SEMPLIFICAZIONE DICHIARATA: lo sconto del 15% si applica solo
// all'abbonamento della NUOVA struttura, non ricalcolato retroattivamente
// su quelle già attive — è una semplificazione rispetto al modello di
// prezzo "somma di tutte le fasce × 0,85" descritto nella spec, scelta
// per restare tecnicamente semplice (nessuna modifica ad abbonamenti
// Stripe già in corso). Da rivalutare se in futuro serve fedeltà totale
// al modello di prezzo originale.
// ============================================================

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const URL_SUCCESSO = Deno.env.get('URL_NUOVA_STRUTTURA_SUCCESSO') || 'https://ospitely.com/dashboard?nuova_struttura=ok';
const URL_ANNULLATO = Deno.env.get('URL_NUOVA_STRUTTURA_ANNULLATA') || 'https://ospitely.com/dashboard';
// Coupon "sconto multi-struttura -15%" creato una tantum sul dashboard Stripe
const COUPON_MULTI_STRUTTURA = Deno.env.get('STRIPE_COUPON_MULTI_STRUTTURA')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // in produzione: restringere a ospitely.com
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PREZZO_PER_FASCIA: Record<string, string> = {
  '1-2': Deno.env.get('STRIPE_PRICE_1_2')!,
  '3-4': Deno.env.get('STRIPE_PRICE_3_4')!,
  '5-7': Deno.env.get('STRIPE_PRICE_5_7')!,
  '8-10': Deno.env.get('STRIPE_PRICE_8_10')!,
  '11-15': Deno.env.get('STRIPE_PRICE_11_15')!,
  '16-30': Deno.env.get('STRIPE_PRICE_16_30')!,
  '31-60': Deno.env.get('STRIPE_PRICE_31_60')!,
  '61-100': Deno.env.get('STRIPE_PRICE_61_100')!,
};

function fasciaDaCamere(numeroCamere: number): string | null {
  if (numeroCamere >= 1 && numeroCamere <= 2) return '1-2';
  if (numeroCamere <= 4) return '3-4';
  if (numeroCamere <= 7) return '5-7';
  if (numeroCamere <= 10) return '8-10';
  if (numeroCamere <= 15) return '11-15';
  if (numeroCamere <= 30) return '16-30';
  if (numeroCamere <= 60) return '31-60';
  if (numeroCamere <= 100) return '61-100';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verifica host autenticato (stesso pattern di crea-portale-cliente:
    // mai fidarsi di un host_id passato a mano nel body)
    const tokenAutorizzazione = req.headers.get('Authorization');
    if (!tokenAutorizzazione) return jsonResponse({ errore: 'Non autenticato' }, 401);

    const supabaseComeUtente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: tokenAutorizzazione } },
    });
    const { data: { user }, error: erroreUtente } = await supabaseComeUtente.auth.getUser();
    if (erroreUtente || !user) return jsonResponse({ errore: 'Sessione non valida' }, 401);

    const { nomeStruttura, tipoStruttura, numeroCamere } = await req.json();
    if (!nomeStruttura || !tipoStruttura || !numeroCamere) {
      return jsonResponse({ errore: 'Tutti i campi sono obbligatori' }, 400);
    }

    const fascia = fasciaDaCamere(Number(numeroCamere));
    if (!fascia) return jsonResponse({ errore: 'Numero di camere non valido (1-100)' }, 400);

    const priceId = PREZZO_PER_FASCIA[fascia];
    if (!priceId) {
      console.error(`Price ID Stripe non configurato per la fascia ${fascia}`);
      return jsonResponse({ errore: 'Servizio momentaneamente non disponibile, riprova più tardi' }, 500);
    }

    // 2. Recupera il customer Stripe già esistente per questo host
    const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: host } = await supabaseAdmin
      .from('hosts')
      .select('stripe_customer_id, max_properties')
      .eq('id', user.id)
      .single();

    if (!host?.stripe_customer_id) {
      return jsonResponse({ errore: 'Nessun abbonamento attivo trovato per questo account' }, 404);
    }

    const metadata = {
      tipo_checkout: 'nuova_struttura',
      host_id: user.id,
      nome_struttura: nomeStruttura,
      tipo_struttura: tipoStruttura,
      numero_camere: String(numeroCamere),
      fascia,
    };

    const sessione = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: host.stripe_customer_id,
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: COUPON_MULTI_STRUTTURA ? [{ coupon: COUPON_MULTI_STRUTTURA }] : undefined,
      metadata,
      subscription_data: { metadata },
      success_url: URL_SUCCESSO,
      cancel_url: URL_ANNULLATO,
    });

    return jsonResponse({ url: sessione.url });
  } catch (err) {
    console.error('Errore crea-checkout-nuova-struttura:', err);
    return jsonResponse({ errore: 'Errore interno, riprova tra poco' }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
