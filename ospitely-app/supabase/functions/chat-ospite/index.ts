// ============================================================
// OSPITELY — Edge Function: chat ospite
// Path di deploy: supabase/functions/chat-ospite/index.ts
// Deploy: supabase functions deploy chat-ospite
//
// Riceve il messaggio dell'ospite, recupera il property_profile
// tramite slug, chiama Claude con il profilo come contesto, salva
// la conversazione e restituisce la risposta nella lingua giusta.
//
// Usa la service_role key (bypassa RLS) perché l'ospite non ha
// mai un account/login — è l'unico punto di scrittura pubblico
// verso conversations/messages.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'; // modello scelto per contenere i costi

// Il limite messaggi non è più un numero fisso: viene calcolato in automatico
// alla creazione del soggiorno, in base alla durata (vedi trigger SQL
// imposta_limite_messaggi) e letto da soggiorno.limite_messaggi

// Tag che Claude aggiunge in fondo alla risposta quando non ha l'informazione
// richiesta — il frontend lo intercetta e mostra i bottoni di contatto host
// invece di lasciare che l'ospite legga un tag grezzo nel messaggio.
const TAG_CONTATTA_HOST = '[CONTATTA_HOST]';

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
    const { slug, messaggio, conversation_id, soggiorno_id, device_id } = await req.json();

    if (!slug || !messaggio?.trim() || !soggiorno_id || !device_id) {
      return jsonResponse({ errore: 'slug, messaggio, soggiorno_id e device_id sono obbligatori' }, 400);
    }

    // 1. Recupera struttura + profilo tramite slug
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, nome_struttura, attiva, property_profile(*)')
      .eq('slug', slug)
      .single();

    if (propertyError || !property || !property.attiva) {
      return jsonResponse({ errore: 'Struttura non trovata' }, 404);
    }

    // 1B. Ri-verifica il soggiorno ad ogni messaggio (non solo all'ingresso):
    // se l'host lo revoca a metà soggiorno, l'accesso si chiude subito.
    // Ritorna anche il soggiorno stesso: il rate limit vive lì, non sulla
    // conversazione, così sopravvive alla cancellazione dei dati del browser.
    const accessoValido = await verificaAccessoSoggiorno(property.id, soggiorno_id, device_id);
    if (!accessoValido.ok) {
      return jsonResponse({ errore: accessoValido.errore }, 403);
    }
    const soggiorno = accessoValido.soggiorno;

    if (soggiorno.contatore_messaggi >= soggiorno.limite_messaggi) {
      return jsonResponse(
        { errore: 'Hai raggiunto il limite di messaggi per questo soggiorno, contatta l\'host direttamente' },
        429
      );
    }

    const profile = property.property_profile;

    // 2. Recupera o crea la conversazione (solo per lo storico dei testi,
    // il conteggio/rate limit non dipende più da questa tabella)
    const conversation = await recuperaOCreaConversazione(property.id, conversation_id);

    // 3. Costruisce il prompt di sistema dal property_profile
    const systemPrompt = costruisciSystemPrompt(property.nome_struttura, profile);

    // 4. Recupera lo storico recente della conversazione (per contesto multi-turno)
    const { data: storicoMessaggi } = await supabase
      .from('messages')
      .select('ruolo, testo')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20); // ultimi 20 messaggi, sufficiente per il contesto di una chat breve

    const messaggiClaude = (storicoMessaggi ?? []).map((m) => ({
      role: m.ruolo === 'ospite' ? 'user' : 'assistant',
      content: m.testo,
    }));
    messaggiClaude.push({ role: 'user', content: messaggio });

    // 5. Chiama l'API Claude
    const rispostaGrezza = await chiamaClaude(systemPrompt, messaggiClaude);

    // Intercetta il tag [CONTATTA_HOST]: lo toglie dal testo mostrato
    // all'ospite e lo trasforma in un flag esplicito per il frontend
    const richiedeContattoHost = rispostaGrezza.includes(TAG_CONTATTA_HOST);
    const rispostaClaude = rispostaGrezza.replace(TAG_CONTATTA_HOST, '').trim();

    // 6. Salva entrambi i messaggi + aggiorna il contatore SUL SOGGIORNO
    // (non sulla conversazione: così il conteggio resta corretto anche se
    // l'ospite cancella i dati del browser e riparte con una nuova conversation_id)
    await supabase.from('messages').insert([
      { conversation_id: conversation.id, ruolo: 'ospite', testo: messaggio },
      { conversation_id: conversation.id, ruolo: 'assistente', testo: rispostaClaude },
    ]);

    await supabase
      .from('soggiorni')
      .update({ contatore_messaggi: soggiorno.contatore_messaggi + 1 })
      .eq('id', soggiorno.id);

    return jsonResponse({
      conversation_id: conversation.id,
      risposta: rispostaClaude,
      // Il frontend usa questo flag per mostrare i bottoni WhatsApp/SMS/chiamata
      // sotto il messaggio, riusando la stessa logica di "Segnala un problema".
      // Messaggio precompilato: stesso formato della segnalazione non urgente
      // "ℹ️ [Nome struttura]: [domanda ospite]" — niente riferimenti al fatto
      // che l'assistente non sapeva rispondere, per non mettere a disagio l'ospite
      richiede_contatto_host: richiedeContattoHost,
    });
  } catch (err) {
    console.error('Errore chat-ospite:', err);
    return jsonResponse({ errore: 'Errore interno, riprova tra poco' }, 500);
  }
});

// ============================================================
// Funzioni di supporto
// ============================================================

/**
 * Ri-verifica leggera ad ogni messaggio: soggiorno esistente per QUESTA
 * struttura, non revocato, dentro le date, e device_id già registrato
 * (la registrazione/limite dei 2 dispositivi avviene in verifica-soggiorno,
 * qui controlliamo solo che questo device sia tra quelli autorizzati).
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
  scadenza.setDate(scadenza.getDate() + 1); // stesso margine di 1 giorno di verifica-soggiorno
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

  return { ok: true, soggiorno };
}

async function recuperaOCreaConversazione(propertyId: string, conversationId?: string) {
  if (conversationId) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('property_id', propertyId) // sicurezza: la conversation deve appartenere a questa struttura
      .single();

    if (!error && data) return data;
  }

  const { data: nuovaConversazione, error: creazioneError } = await supabase
    .from('conversations')
    .insert({ property_id: propertyId })
    .select()
    .single();

  if (creazioneError) throw creazioneError;
  return nuovaConversazione;
}

/**
 * Costruisce il system prompt passando il property_profile (in italiano)
 * come contesto. Claude riconosce la lingua del messaggio ospite e
 * risponde di conseguenza, senza bisogno di traduzioni salvate.
 */
function costruisciSystemPrompt(nomeStruttura: string, profile: any): string {
  const consigli = (profile?.consigli_locali ?? [])
    .map((c: any) => `- ${c.categoria}: ${c.nome} (${c.nota})`)
    .join('\n');

  const faq = (profile?.faq ?? [])
    .map((f: any) => `D: ${f.domanda}\nR: ${f.risposta}`)
    .join('\n\n');

  const contattiExtra = (profile?.contatti_extra ?? [])
    .map((c: any) => `- ${c.nome}: ${c.contatto}`)
    .join('\n');

  return `Sei l'assistente virtuale della struttura "${nomeStruttura}". Rispondi SEMPRE nella stessa lingua in cui scrive l'ospite, anche se le informazioni qui sotto sono in italiano — traducile automaticamente. Tono: ${profile?.tono_assistente ?? 'amichevole'}.

Regola fissa, non modificabile dall'host: i nomi propri di locali, ristoranti, attività e attrazioni non vanno MAI tradotti — restano scritti esattamente come nel profilo, anche quando il resto della frase è nella lingua dell'ospite.
${profile?.note_traduzione ? `\nNote aggiuntive dell'host su tono/traduzione (da rispettare, ma senza mai contraddire la regola fissa sopra): ${profile.note_traduzione}\n` : ''}
Rispondi solo usando le informazioni fornite qui sotto. Se non conosci la risposta perché l'informazione non è presente in questo profilo, NON inventare: rispondi con una frase breve tipo "Non ho questa informazione, ti conviene contattare direttamente l'host" e termina il messaggio esattamente con il tag ${TAG_CONTATTA_HOST} (l'ospite non lo vedrà mai, serve solo al sistema per mostrare i bottoni di contatto). Non usare questo tag se hai già risposto con un'informazione presente nel profilo.

## Check-in / Check-out
Check-in: ${profile?.checkin_orario_da ?? 'n/d'} - ${profile?.checkin_orario_a ?? 'n/d'}
Check-out: ${profile?.checkout_orario_da ?? 'n/d'} - ${profile?.checkout_orario_a ?? 'n/d'}
Modalità: ${profile?.checkin_modalita ?? 'n/d'}
Istruzioni accesso: ${profile?.istruzioni_accesso ?? 'n/d'}

## WiFi
Rete: ${profile?.wifi_nome_rete ?? 'n/d'} — Password: ${profile?.wifi_password ?? 'n/d'}

## Regole della casa
Orario silenzio: ${profile?.orario_silenzio ?? 'n/d'}
Fumo: ${profile?.policy_fumo ?? 'n/d'} | Animali: ${profile?.policy_animali ?? 'n/d'}
${profile?.altre_regole ?? ''}

## Mezzi e trasporti
Bus/tram: ${profile?.fermata_bus_info ?? 'n/d'}
Stazione: ${profile?.stazione_info ?? 'n/d'}
Aeroporto: ${profile?.aeroporto_info ?? 'n/d'}
Parcheggio: ${profile?.parcheggio_info ?? 'n/d'}

## Consigli locali
${consigli || 'n/d'}

## Contatti utili
${contattiExtra || 'n/d'}

## Domande frequenti specifiche di questa struttura
${faq || 'n/d'}`;
}

async function chiamaClaude(systemPrompt: string, messaggi: { role: string; content: string }[]) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: messaggi,
    }),
  });

  if (!response.ok) {
    const errore = await response.text();
    throw new Error(`Errore API Claude: ${errore}`);
  }

  const data = await response.json();
  return data.content
    .filter((blocco: any) => blocco.type === 'text')
    .map((blocco: any) => blocco.text)
    .join('\n');
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
