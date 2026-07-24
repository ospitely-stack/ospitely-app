import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle, MessageCircleWarning, Phone, MessageCircle, X, Loader2 } from 'lucide-react';
import { rilevaLinguaInterfaccia, creaTraduttore } from './ospitely-i18n.js';

// ============================================================
// OSPITELY — Interfaccia chat ospite
// Lato client, pagina pubblica raggiunta da ospitely.com/[slug]
// (routing gestito dal trucco 404.html su GitHub Pages, vedi spec).
//
// Nessuna sessione Supabase qui: l'ospite non ha mai un account.
// Parla solo con le Edge Function pubbliche via fetch, protette da
// verifica-soggiorno + device_id (vedi le Edge Function dedicate).
// ============================================================

// SUPABASE: valorizzare con l'URL reale del progetto Supabase
const FUNCTIONS_BASE_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
const URL_VERIFICA_SOGGIORNO = `${FUNCTIONS_BASE_URL}/verifica-soggiorno`;
const URL_CHAT = `${FUNCTIONS_BASE_URL}/chat-ospite`;
const URL_SEGNALA = `${FUNCTIONS_BASE_URL}/segnala-problema`;

const CHIAVE_DEVICE_ID = 'ospitely_device_id';

/**
 * Il device_id è globale (non per struttura): identifica il telefono,
 * non la singola visita. Il limite dei 2 dispositivi è comunque
 * verificato per soggiorno lato server, non qui.
 */
function recuperaOCreaDeviceId() {
  let id = localStorage.getItem(CHIAVE_DEVICE_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CHIAVE_DEVICE_ID, id);
  }
  return id;
}

function chiaveSoggiorno(slug) {
  return `ospitely_soggiorno_${slug}`;
}

export default function ChatOspite({ slug }) {
  const deviceId = useRef(recuperaOCreaDeviceId()).current;
  const t = useRef(creaTraduttore(rilevaLinguaInterfaccia())).current;

  const [soggiornoId, setSoggiornoId] = useState(() => localStorage.getItem(chiaveSoggiorno(slug)));
  const [messaggi, setMessaggi] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [limiteRaggiunto, setLimiteRaggiunto] = useState(false);
  const [mostraSegnalazione, setMostraSegnalazione] = useState(false);
  const [contattoSuggerito, setContattoSuggerito] = useState(null); // { domanda } se l'ultima risposta richiede contatto host

  // Se non c'è ancora un soggiorno verificato, mostra la schermata del codice
  if (!soggiornoId) {
    return (
      <SchermataCodice
        slug={slug}
        deviceId={deviceId}
        t={t}
        onVerificato={(id) => {
          localStorage.setItem(chiaveSoggiorno(slug), id);
          setSoggiornoId(id);
        }}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-4 py-3">
        <h1 className="font-semibold text-stone-900">Assistente struttura</h1>
      </header>

      <ListaMessaggi
        messaggi={messaggi}
        limiteRaggiunto={limiteRaggiunto}
        contattoSuggerito={contattoSuggerito}
        t={t}
        onApriSegnalazione={(domanda) => {
          setContattoSuggerito(null);
          setMostraSegnalazione({ testoPrecompilato: domanda ?? '' });
        }}
      />

      <BarraInput
        slug={slug}
        deviceId={deviceId}
        soggiornoId={soggiornoId}
        conversationId={conversationId}
        disabilitato={limiteRaggiunto}
        t={t}
        onSoggiornoNonValido={() => {
          // Revocato o scaduto durante la chat: si riparte dal codice
          localStorage.removeItem(chiaveSoggiorno(slug));
          setSoggiornoId(null);
        }}
        onLimiteRaggiunto={() => setLimiteRaggiunto(true)}
        onNuovoMessaggio={(msgOspite, risposta, nuovoConversationId, richiedeContatto) => {
          setConversationId(nuovoConversationId);
          setMessaggi((m) => [
            ...m,
            { ruolo: 'ospite', testo: msgOspite },
            { ruolo: 'assistente', testo: risposta },
          ]);
          setContattoSuggerito(richiedeContatto ? { domanda: msgOspite } : null);
        }}
      />

      <button
        type="button"
        onClick={() => setMostraSegnalazione({ testoPrecompilato: '' })}
        className="mx-4 mb-3 flex items-center justify-center gap-2 text-sm font-medium text-red-700 border border-red-200 bg-red-50 rounded-lg py-2.5"
      >
        <MessageCircleWarning size={16} /> {t('segnalaProblema')}
      </button>

      {mostraSegnalazione && (
        <ModaleSegnalazione
          slug={slug}
          deviceId={deviceId}
          soggiornoId={soggiornoId}
          testoIniziale={mostraSegnalazione.testoPrecompilato}
          t={t}
          onChiudi={() => setMostraSegnalazione(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// Schermata inserimento codice soggiorno (gate prima della chat)
// ============================================================
function SchermataCodice({ slug, deviceId, t, onVerificato }) {
  const [codice, setCodice] = useState('');
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);

  async function verifica() {
    if (!codice.trim()) return;
    setCaricamento(true);
    setErrore(null);

    try {
      const res = await fetch(URL_VERIFICA_SOGGIORNO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ slug, codice: codice.trim(), device_id: deviceId }),
      });
      const dati = await res.json();

      if (!res.ok) {
        setErrore(dati.errore ?? 'Codice non valido');
        setCaricamento(false);
        return;
      }

      onVerificato(dati.soggiorno_id);
    } catch {
      setErrore(t('erroreConnessione'));
      setCaricamento(false);
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-center px-6 bg-stone-50">
      <h1 className="text-xl font-semibold text-stone-900 mb-1">{t('benvenutoTitolo')}</h1>
      <p className="text-sm text-stone-500 mb-6">{t('benvenutoSottotitolo')}</p>

      <input
        className="w-full rounded-lg border border-stone-300 px-4 py-3 text-center text-lg tracking-widest uppercase font-mono focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        placeholder={t('placeholderCodice')}
        maxLength={6}
        value={codice}
        onChange={(e) => setCodice(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && verifica()}
      />

      {errore && (
        <p className="mt-3 text-sm text-red-600 flex items-start gap-1.5">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {errore}
        </p>
      )}

      <button
        type="button"
        onClick={verifica}
        disabled={caricamento || !codice.trim()}
        className="mt-4 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
      >
        {caricamento ? <Loader2 size={18} className="animate-spin" /> : t('verificaCodice')}
      </button>
    </div>
  );
}

// ============================================================
// Lista messaggi + stati speciali (limite raggiunto, contatto host)
// ============================================================
function ListaMessaggi({ messaggi, limiteRaggiunto, contattoSuggerito, t, onApriSegnalazione }) {
  const fondoRef = useRef(null);
  useEffect(() => {
    fondoRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messaggi, limiteRaggiunto, contattoSuggerito]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messaggi.length === 0 && (
        <p className="text-center text-sm text-stone-400 mt-8">{t('messaggioIniziale')}</p>
      )}

      {messaggi.map((m, i) => (
        <div key={i} className={`flex ${m.ruolo === 'ospite' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] ${
              m.ruolo === 'ospite'
                ? 'bg-stone-800 text-white rounded-br-sm'
                : 'bg-white text-stone-800 border border-stone-200 rounded-bl-sm'
            }`}
          >
            {m.testo}
          </div>
        </div>
      ))}

      {contattoSuggerito && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => onApriSegnalazione(contattoSuggerito.domanda)}
            className="text-sm text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-100"
          >
            {t('contattaHost')}
          </button>
        </div>
      )}

      {limiteRaggiunto && (
        <div className="flex justify-start">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-3 py-2.5 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {t('limiteMessaggio')}
          </div>
        </div>
      )}

      <div ref={fondoRef} />
    </div>
  );
}

// ============================================================
// Barra di input in basso
// ============================================================
function BarraInput({
  slug, deviceId, soggiornoId, conversationId, disabilitato, t,
  onSoggiornoNonValido, onLimiteRaggiunto, onNuovoMessaggio,
}) {
  const [testo, setTesto] = useState('');
  const [invio, setInvio] = useState(false);

  async function invia() {
    const messaggio = testo.trim();
    if (!messaggio || invio || disabilitato) return;

    setTesto('');
    setInvio(true);

    try {
      const res = await fetch(URL_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ slug, messaggio, conversation_id: conversationId, soggiorno_id: soggiornoId, device_id: deviceId }),
      });
      const dati = await res.json();

      if (res.status === 403) {
        onSoggiornoNonValido();
        return;
      }
      if (res.status === 429) {
        onLimiteRaggiunto();
        return;
      }
      if (!res.ok) {
        onNuovoMessaggio(messaggio, dati.errore ?? t('erroreConnessione'), conversationId, false);
        return;
      }

      onNuovoMessaggio(messaggio, dati.risposta, dati.conversation_id, dati.richiede_contatto_host);
    } catch {
      onNuovoMessaggio(messaggio, t('erroreConnessione'), conversationId, false);
    } finally {
      setInvio(false);
    }
  }

  return (
    <div className="border-t border-stone-200 bg-white px-3 py-3 flex items-center gap-2">
      <input
        className="flex-1 rounded-full border border-stone-300 px-4 py-2.5 text-[15px] focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 disabled:bg-stone-100"
        placeholder={disabilitato ? t('limiteInputPlaceholder') : t('placeholderInput')}
        value={testo}
        disabled={disabilitato}
        onChange={(e) => setTesto(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && invia()}
      />
      <button
        type="button"
        onClick={invia}
        disabled={disabilitato || invio || !testo.trim()}
        className="shrink-0 bg-stone-800 disabled:bg-stone-300 text-white rounded-full p-2.5"
        aria-label="Invia"
      >
        {invio ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
      </button>
    </div>
  );
}

// ============================================================
// Modale "Segnala un problema" — urgente / non urgente + canale
// ============================================================
function ModaleSegnalazione({ slug, deviceId, soggiornoId, testoIniziale, t, onChiudi }) {
  const [tipo, setTipo] = useState(null); // 'urgente' | 'non_urgente'
  const [testo, setTesto] = useState(testoIniziale);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(null);

  async function invia(canale) {
    if (!testo.trim()) {
      setErrore(t('erroreCodiceVuoto'));
      return;
    }
    setInvio(true);
    setErrore(null);

    try {
      const res = await fetch(URL_SEGNALA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({
          slug, soggiorno_id: soggiornoId, device_id: deviceId,
          tipo, canale_scelto: canale, testo: testo.trim(),
        }),
      });
      const dati = await res.json();

      if (!res.ok) {
        setErrore(dati.errore ?? t('erroreConnessione'));
        setInvio(false);
        return;
      }

      if (dati.link) {
        window.location.href = dati.link;
      }
      onChiudi();
    } catch {
      setErrore(t('erroreConnessione'));
      setInvio(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20">
      <div className="w-full max-w-md bg-white rounded-t-2xl px-5 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-900">{t('modaleTitolo')}</h2>
          <button type="button" onClick={onChiudi} aria-label="Chiudi">
            <X size={20} className="text-stone-400" />
          </button>
        </div>

        {!tipo ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setTipo('urgente')}
              className="w-full text-left border border-red-200 bg-red-50 rounded-lg px-4 py-3"
            >
              <span className="font-medium text-red-700">{t('urgenteTitolo')}</span>
              <p className="text-sm text-red-600 mt-0.5">{t('urgenteSottotitolo')}</p>
            </button>
            <button
              type="button"
              onClick={() => setTipo('non_urgente')}
              className="w-full text-left border border-stone-200 bg-stone-50 rounded-lg px-4 py-3"
            >
              <span className="font-medium text-stone-700">{t('nonUrgenteTitolo')}</span>
              <p className="text-sm text-stone-500 mt-0.5">{t('nonUrgenteSottotitolo')}</p>
            </button>
          </div>
        ) : (
          <>
            <textarea
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-[15px] min-h-[90px] focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              placeholder={t('placeholderDescrizione')}
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
            />
            {errore && <p className="mt-2 text-sm text-red-600">{errore}</p>}

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => invia('whatsapp')}
                disabled={invio}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-medium py-3 rounded-lg disabled:opacity-60"
              >
                <MessageCircle size={18} /> {t('whatsapp')}
              </button>
              {tipo === 'urgente' && (
                <button
                  type="button"
                  onClick={() => invia('chiamata')}
                  disabled={invio}
                  className="w-full flex items-center justify-center gap-2 bg-stone-800 text-white font-medium py-3 rounded-lg disabled:opacity-60"
                >
                  <Phone size={18} /> {t('chiama')}
                </button>
              )}
              <button
                type="button"
                onClick={() => invia('sms')}
                disabled={invio}
                className="w-full flex items-center justify-center gap-2 border border-stone-300 text-stone-700 font-medium py-3 rounded-lg disabled:opacity-60"
              >
                {t('sms')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
