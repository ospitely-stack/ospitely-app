// ============================================================
// OSPITELY — Edge Function: segnala-problema
// Path di deploy: supabase/functions/segnala-problema/index.ts
//
// Riceve la segnalazione dell'ospite (urgente o non urgente),
// la salva in `alerts` per lo storico host, e ritorna il link
// nativo pronto (wa.me / tel: / sms:) che il frontend apre subito
// sul dispositivo dell'ospite. L'invio vero e proprio del messaggio
// resta sempre gestito dal telefono dell'ospite, non dal server.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // in produzione: restringere a ospitely.com
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CANALI_VALIDI = ['whatsapp', 'sms', 'chiamata'];
const TIPI_VALIDI = ['urgente', 'non_urgente'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, soggiorno_id, device_id, tipo, canale_scelto, testo } = await req.json();

    if (!slug || !soggiorno_id || !device_id || !tipo || !canale_scelto || !testo?.trim()) {
      return jsonResponse({ errore: 'Campi obbligatori mancanti' }, 400);
    }
    if (!TIPI_VALIDI.includes(tipo)) {
      return jsonResponse({ errore: 'Tipo segnalazione non valido' }, 400);
    }
    if (!CANALI_VALIDI.includes(canale_scelto)) {
      return jsonResponse({ errore: 'Canale non valido' }, 400);
    }
    // "Chiamata diretta" ha senso solo per le urgenze, non per le non urgenti
    if (canale_scelto === 'chiamata' && tipo !== 'urgente') {
      return jsonResponse({ errore: 'La chiamata diretta è disponibile solo per le urgenze' }, 400);
    }

    // 1. Recupera struttura + i contatti host dal profilo
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, nome_struttura, attiva, property_profile(numero_emergenze, whatsapp_host)')
      .eq('slug', slug)
      .single();

    if (propertyError || !property || !property.attiva) {
      return jsonResponse({ errore: 'Struttura non trovata' }, 404);
    }

    // 2. Verifica che il soggiorno sia valido (stessa logica di chat-ospite:
    // non revocato, dentro le date, dispositivo autorizzato)
    const accessoValido = await verificaAccessoSoggiorno(property.id, soggiorno_id, device_id);
    if (!accessoValido.ok) {
      return jsonResponse({ errore: accessoValido.errore }, 403);
    }

    // 3. Salva la segnalazione per lo storico host (dashboard)
    const { error: insertError } = await supabase.from('alerts').insert({
      property_id: property.id,
      tipo,
      canale_scelto,
      testo: testo.trim(),
    });

    if (insertError) throw insertError;

    // 4. Costruisce il link nativo pronto per il frontend
    const profile = property.property_profile;
    const numeroContatto = tipo === 'urgente'
      ? (profile?.numero_emergenze || profile?.whatsapp_host)
      : profile?.whatsapp_host;

    if (!numeroContatto) {
      // Segnalazione comunque salvata (visibile in dashboard), ma senza
      // un numero configurato non possiamo generare il link nativo
      return jsonResponse({
        salvato: true,
        link: null,
        avviso: 'Segnalazione registrata, ma la struttura non ha un numero di contatto configurato',
      });
    }

    const prefisso = tipo === 'urgente' ? '🚨 URGENTE' : 'ℹ️';
    const messaggioPrecompilato = `${prefisso} - ${property.nome_struttura}: ${testo.trim()}`;
    const numeroPulito = numeroContatto.replace(/[^\d+]/g, ''); // solo cifre e + iniziale

    const link = costruisciLinkContatto(canale_scelto, numeroPulito, messaggioPrecompilato);

    return jsonResponse({ salvato: true, link });
  } catch (err) {
    console.error('Errore segnala-problema:', err);
    return jsonResponse({ errore: 'Errore interno, riprova tra poco' }, 500);
  }
});

// ============================================================
// Funzioni di supporto
// ============================================================

/**
 * Stessa verifica usata in chat-ospite — in produzione andrebbe
 * estratta in un modulo condiviso (_shared/soggiorno.ts) importato
 * da entrambe le function, invece di duplicarla.
 */
async function verificaAccessoSoggiorno(propertyId: string, soggiornoId: string, deviceId: string) {
  const { data: soggiorno } = await supabase
    .from('soggiorni')
    .select('*')
    .eq('id', soggiornoId)
    .eq('property_id', propertyId)
    .maybeSingle();

  if (!soggiorno) return { ok: false, errore: 'Soggiorno non valido per questa struttura' };
  if (soggiorno.revocato) return { ok: false, errore: 'Questo codice non è più attivo' };

  const oggi = new Date().toISOString().slice(0, 10);
  const scadenza = new Date(soggiorno.data_checkout);
  scadenza.setDate(scadenza.getDate() + 1);
  const scadenzaIso = scadenza.toISOString().slice(0, 10);

  if (oggi < soggiorno.data_checkin || oggi > scadenzaIso) {
    return { ok: false, errore: 'Questo codice non è più valido per le date odierne' };
  }

  const { data: dispositivo } = await supabase
    .from('soggiorno_dispositivi')
    .select('device_id')
    .eq('soggiorno_id', soggiornoId)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (!dispositivo) return { ok: false, errore: 'Dispositivo non autorizzato per questo soggiorno' };

  return { ok: true };
}

/**
 * Costruisce il link nativo giusto per il canale scelto.
 * Il frontend deve solo fare `window.location.href = link` (o aprirlo
 * in una nuova scheda) per far partire WhatsApp/SMS/chiamata sul
 * dispositivo dell'ospite — nessun invio avviene lato server.
 */
function costruisciLinkContatto(canale: string, numero: string, messaggio: string): string {
  const messaggioEncoded = encodeURIComponent(messaggio);

  switch (canale) {
    case 'whatsapp':
      // wa.me vuole il numero senza "+" iniziale
      return `https://wa.me/${numero.replace('+', '')}?text=${messaggioEncoded}`;
    case 'sms':
      return `sms:${numero}?body=${messaggioEncoded}`;
    case 'chiamata':
      return `tel:${numero}`;
    default:
      throw new Error('Canale non gestito');
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
