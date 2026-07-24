// ============================================================
// OSPITELY — Edge Function: verifica-soggiorno
// Path di deploy: supabase/functions/verifica-soggiorno/index.ts
//
// Punto d'ingresso PRIMA di aprire la chat: l'ospite inserisce il
// codice soggiorno ricevuto dall'host. Se valido, il frontend salva
// { soggiorno_id, device_id } in locale e può iniziare a chattare
// (la chat-ospite li richiede a ogni messaggio, vedi quel file).
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LIMITE_TENTATIVI = 10;
const FINESTRA_TENTATIVI_MINUTI = 10;
const LIMITE_DISPOSITIVI = 2;
const MARGINE_GIORNI_DOPO_CHECKOUT = 1; // per chi scrive per un problema tardivo

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // in produzione: restringere a ospitely.com
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, codice, device_id } = await req.json();

    if (!slug || !codice?.trim() || !device_id) {
      return jsonResponse({ errore: 'slug, codice e device_id sono obbligatori' }, 400);
    }

    const codiceNormalizzato = codice.trim().toUpperCase();
    const ipHash = await hashIp(req.headers.get('x-forwarded-for') ?? 'sconosciuto');

    // 1. Trova la struttura
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, attiva')
      .eq('slug', slug)
      .single();

    if (propertyError || !property || !property.attiva) {
      return jsonResponse({ errore: 'Struttura non trovata' }, 404);
    }

    // 2. Protezione brute-force: troppi tentativi falliti di recente da questo IP?
    const bloccato = await troppiTentativiFalliti(property.id, ipHash);
    if (bloccato) {
      return jsonResponse(
        { errore: 'Troppi tentativi falliti, riprova tra qualche minuto' },
        429
      );
    }

    // 3. Cerca il codice per QUESTA struttura
    const { data: soggiorno } = await supabase
      .from('soggiorni')
      .select('*')
      .eq('property_id', property.id)
      .eq('codice', codiceNormalizzato)
      .maybeSingle();

    if (!soggiorno) {
      // Codice inesistente o valido per un'altra struttura: conta come tentativo fallito
      await registraTentativoFallito(property.id, ipHash);
      return jsonResponse({ errore: 'Codice non valido per questa struttura' }, 401);
    }

    // 4. Codice trovato ma non più valido (revocato o fuori dalle date):
    // NON conta come tentativo di brute-force, è un caso legittimo diverso
    if (soggiorno.revocato) {
      return jsonResponse({ errore: 'Questo codice non è più attivo' }, 403);
    }

    const oggi = new Date().toISOString().slice(0, 10);
    const scadenzaConMargine = aggiungiGiorni(soggiorno.data_checkout, MARGINE_GIORNI_DOPO_CHECKOUT);

    if (oggi < soggiorno.data_checkin || oggi > scadenzaConMargine) {
      return jsonResponse({ errore: 'Questo codice non è valido per le date odierne' }, 403);
    }

    // 5. Limite dispositivi
    const { data: dispositiviEsistenti } = await supabase
      .from('soggiorno_dispositivi')
      .select('device_id')
      .eq('soggiorno_id', soggiorno.id);

    const giaRegistrato = dispositiviEsistenti?.some((d) => d.device_id === device_id);

    if (!giaRegistrato) {
      if ((dispositiviEsistenti?.length ?? 0) >= LIMITE_DISPOSITIVI) {
        return jsonResponse(
          { errore: `Questo codice è già in uso su ${LIMITE_DISPOSITIVI} dispositivi. Contatta l'host se ti serve un dispositivo in più.` },
          403
        );
      }
      await supabase.from('soggiorno_dispositivi').insert({ soggiorno_id: soggiorno.id, device_id });
    }

    return jsonResponse({ autorizzato: true, soggiorno_id: soggiorno.id });
  } catch (err) {
    console.error('Errore verifica-soggiorno:', err);
    return jsonResponse({ errore: 'Errore interno, riprova tra poco' }, 500);
  }
});

// ============================================================
// Funzioni di supporto
// ============================================================

async function troppiTentativiFalliti(propertyId: string, ipHash: string): Promise<boolean> {
  const finestraFa = new Date(Date.now() - FINESTRA_TENTATIVI_MINUTI * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('tentativi_codice_falliti')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('ip_hash', ipHash)
    .gte('tentato_il', finestraFa);

  return (count ?? 0) >= LIMITE_TENTATIVI;
}

async function registraTentativoFallito(propertyId: string, ipHash: string) {
  await supabase.from('tentativi_codice_falliti').insert({ property_id: propertyId, ip_hash: ipHash });
}

function aggiungiGiorni(dataIso: string, giorni: number): string {
  const d = new Date(dataIso);
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
}

/**
 * Hash semplice dell'IP per non salvarlo mai in chiaro nel database
 * (basta a scoraggiare il riconoscimento diretto, non è crittografia forte —
 * sufficiente per lo scopo: raggruppare i tentativi, non identificare persone).
 */
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
