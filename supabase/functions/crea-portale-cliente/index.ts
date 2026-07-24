// ============================================================
// OSPITELY — Edge Function: crea-portale-cliente
// Path di deploy: supabase/functions/crea-portale-cliente/index.ts
//
// Crea una sessione del Customer Portal di Stripe per l'host già
// autenticato (gestione piano, metodo di pagamento, fatture, disdetta),
// e ritorna l'URL a cui reindirizzarlo. A differenza delle Edge Function
// lato ospite, qui il chiamante DEVE essere un host loggato — verifica
// il token della sessione prima di fare qualunque cosa.
// ============================================================

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const URL_RITORNO = Deno.env.get('URL_RITORNO_PORTALE') || 'https://ospitely.com/dashboard';

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' });
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // in produzione: restringere a ospitely.com
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verifica che chi chiama sia davvero un host loggato — il client
    // manda il proprio access token nell'header Authorization, lo si
    // valida creando un client Supabase "come quell'utente" (chiave anon
    // + token), MAI fidandosi di un host_id passato a mano nel body
    const tokenAutorizzazione = req.headers.get('Authorization');
    if (!tokenAutorizzazione) {
      return jsonResponse({ errore: 'Non autenticato' }, 401);
    }

    const supabaseComeUtente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: tokenAutorizzazione } },
    });

    const { data: { user }, error: erroreUtente } = await supabaseComeUtente.auth.getUser();
    if (erroreUtente || !user) {
      return jsonResponse({ errore: 'Sessione non valida' }, 401);
    }

    // 2. Recupera lo stripe_customer_id di QUESTO host (mai di un altro)
    const { data: host, error: erroreHost } = await supabaseAdmin
      .from('hosts')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (erroreHost || !host?.stripe_customer_id) {
      return jsonResponse({ errore: 'Nessun abbonamento associato a questo account' }, 404);
    }

    // 3. Crea la sessione del portale
    const sessionePortale = await stripe.billingPortal.sessions.create({
      customer: host.stripe_customer_id,
      return_url: URL_RITORNO,
    });

    return jsonResponse({ url: sessionePortale.url });
  } catch (err) {
    console.error('Errore crea-portale-cliente:', err);
    return jsonResponse({ errore: 'Errore interno, riprova tra poco' }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
