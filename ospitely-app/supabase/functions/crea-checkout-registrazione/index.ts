// ============================================================
// OSPITELY — Edge Function: crea-checkout-registrazione
// Path di deploy: supabase/functions/crea-checkout-registrazione/index.ts
//
// Riceve i dati del form di registrazione (host + prima struttura),
// crea una sessione Stripe Checkout con quei dati come metadata, e
// ritorna l'URL a cui reindirizzare il browser. L'host e la struttura
// vengono creati solo DOPO il pagamento, dal webhook (prossimo pezzo),
// che leggerà proprio questi metadata.
// ============================================================

import Stripe from 'https://esm.sh/stripe@14?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const URL_SUCCESSO = Deno.env.get('URL_REGISTRAZIONE_SUCCESSO') || 'https://ospitely.com/register/completata';
const URL_ANNULLATO = Deno.env.get('URL_REGISTRAZIONE_ANNULLATA') || 'https://ospitely.com/register';

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // in produzione: restringere a ospitely.com
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Mappa fascia camere → Price ID Stripe (creati una tantum sul dashboard Stripe).
// SUPABASE/STRIPE: sostituire con i Price ID reali dopo averli creati.
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
    const { nome, cognome, email, telefonoWhatsapp, nomeStruttura, tipoStruttura, numeroCamere } = await req.json();

    if (!nome || !cognome || !email || !telefonoWhatsapp || !nomeStruttura || !tipoStruttura || !numeroCamere) {
      return jsonResponse({ errore: 'Tutti i campi sono obbligatori' }, 400);
    }

    const fascia = fasciaDaCamere(Number(numeroCamere));
    if (!fascia) {
      return jsonResponse({ errore: 'Numero di camere non valido (1-100)' }, 400);
    }

    const priceId = PREZZO_PER_FASCIA[fascia];
    if (!priceId) {
      // Configurazione mancante lato server, non un errore dell'utente
      console.error(`Price ID Stripe non configurato per la fascia ${fascia}`);
      return jsonResponse({ errore: 'Servizio momentaneamente non disponibile, riprova più tardi' }, 500);
    }

    // Tutti i dati necessari al webhook per creare host + prima struttura
    // dopo il pagamento — Stripe conserva i metadata per tutta la vita
    // dell'abbonamento, non solo per questo singolo checkout.
    const metadata = {
      tipo_checkout: 'registrazione',
      nome,
      cognome,
      telefono_whatsapp: telefonoWhatsapp,
      nome_struttura: nomeStruttura,
      tipo_struttura: tipoStruttura,
      numero_camere: String(numeroCamere),
      fascia,
    };

    const sessione = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata }, // presenti anche sull'abbonamento, non solo sulla sessione una tantum
      success_url: `${URL_SUCCESSO}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: URL_ANNULLATO,
    });

    return jsonResponse({ url: sessione.url });
  } catch (err) {
    console.error('Errore crea-checkout-registrazione:', err);
    return jsonResponse({ errore: 'Errore interno, riprova tra poco' }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
