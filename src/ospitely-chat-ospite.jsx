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

// Trasforma lo slug ("hotel-test-finale") in un nome leggibile ("Hotel Test Finale")
// per l'header, senza bisogno di una chiamata in più al server.
function nomeLeggibileDaSlug(slug) {
  return slug
    .split('-')
    .map((parola) => parola.charAt(0).toUpperCase() + parola.slice(1))
    .join(' ');
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
    <div className="max-w-md mx-auto flex flex-col h-screen bg-[#FBF7F1]">
      <header className="relative bg-gradient-to-br from-[#0E3D3C] to-[#1D5C56] px-5 pt-5 pb-4 overflow-hidden">
        <div className="absolute -right-8 -top-10 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-2 top-6 w-16 h-16 rounded-full bg-[#E8A24A]/20" />
        <p className="relative text-[11px] font-medium tracking-[0.16em] text-teal-100/80 uppercase">Il tuo assistente</p>
        <h1 className="relative font-display text-xl text-white mt-0.5">{nomeLeggibileDaSlug(slug)}</h1>
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
        className="mx-4 mb-4 flex items-center justify-center gap-2 text-sm font-medium text-[#B4472B] border border-[#E8A24A]/40 bg-[#FCEEDF] rounded-2xl py-3 hover:bg-[#FAE3C9] transition-colors"
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
    <div className="relative max-w-md mx-auto min-h-screen flex flex-col justify-center px-7 overflow-hidden bg-[#FBF7F1]">
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-br from-[#0E3D3C] to-[#1D5C56]" />
      <div className="absolute -right-10 top-8 w-40 h-40 rounded-full bg-[#E8A24A]/25" />
      <div className="absolute right-16 top-32 w-16 h-16 rounded-full bg-white/10" />

      <div className="relative">
        <p className="text-[11px] font-medium tracking-[0.2em] text-teal-100/80 uppercase mb-3">Ospitely</p>
        <h1 className="font-display text-3xl text-white leading-tight mb-2">{t('benvenutoTitolo')}</h1>
        <p className="text-sm text-teal-50/80 mb-10">{t('benvenutoSottotitolo')}</p>

        <div className="bg-white rounded-3xl shadow-xl shadow-[#0E3D3C]/15 px-6 py-7">
          <input
            className="w-full rounded-2xl border-2 border-stone-200 px-4 py-3.5 text-center text-lg tracking-[0.3em] uppercase font-mono text-stone-800 focus:border-[#1D5C56] focus:outline-none focus:ring-2 focus:ring-[#1D5C56]/15"
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
            className="mt-5 w-full bg-[#D9653D] hover:bg-[#C2552F] disabled:bg-stone-300 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            {caricamento ? <Loader2 size={18} className="animate-spin" /> : t('verificaCodice')}
          </button>
        </div>
      </div>
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
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
      {messaggi.length === 0 && (
        <div className="text-center mt-10 px-4">
          <p className="text-3xl mb-3">🌿</p>
          <p className="text-sm text-stone-500">{t('messaggioIniziale')}</p>
        </div>
      )}

      {messaggi.map((m, i) => (
        <div key={i} className={`flex ${m.ruolo === 'ospite' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
              m.ruolo === 'ospite'
                ? 'bg-[#0E3D3C] text-white rounded-br-md'
                : 'bg-white text-stone-800 shadow-sm shadow-stone-900/5 rounded-bl-md'
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
            className="text-sm font-medium text-[#0E3D3C] border border-[#0E3D3C]/20 bg-white rounded-xl px-3.5 py-2 hover:bg-[#0E3D3C]/5 transition-colors"
          >
            {t('contattaHost')}
          </button>
        </div>
      )}

      {limiteRaggiunto && (
        <div className="flex justify-start">
          <div className="bg-[#FCEEDF] border border-[#E8A24A]/30 text-[#8A4A1E] text-sm rounded-xl px-3.5 py-2.5 flex items-start gap-2">
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
    <div className="border-t border-stone-200/70 bg-white px-3 py-3.5 flex items-center gap-2">
      <input
        className="flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 py-2.5 text-[15px] focus:border-[#1D5C56] focus:outline-none focus:ring-2 focus:ring-[#1D5C56]/15 focus:bg-white disabled:bg-stone-100 transition-colors"
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
        className="shrink-0 bg-[#D9653D] hover:bg-[#C2552F] disabled:bg-stone-300 text-white rounded-full p-3 transition-colors"
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
    <div className="fixed inset-0 bg-[#0E3D3C]/50 backdrop-blur-[2px] flex items-end justify-center z-20">
      <div className="w-full max-w-md bg-white rounded-t-3xl px-5 pt-5 pb-7">
        <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-stone-900">{t('modaleTitolo')}</h2>
          <button type="button" onClick={onChiudi} aria-label="Chiudi" className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>

        {!tipo ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setTipo('urgente')}
              className="w-full text-left border border-red-200 bg-red-50 rounded-2xl px-4 py-3.5 hover:bg-red-100/70 transition-colors"
            >
              <span className="font-medium text-red-700">{t('urgenteTitolo')}</span>
              <p className="text-sm text-red-600 mt-0.5">{t('urgenteSottotitolo')}</p>
            </button>
            <button
              type="button"
              onClick={() => setTipo('non_urgente')}
              className="w-full text-left border border-stone-200 bg-stone-50 rounded-2xl px-4 py-3.5 hover:bg-stone-100 transition-colors"
            >
              <span className="font-medium text-stone-700">{t('nonUrgenteTitolo')}</span>
              <p className="text-sm text-stone-500 mt-0.5">{t('nonUrgenteSottotitolo')}</p>
            </button>
          </div>
        ) : (
          <>
            <textarea
              className="w-full rounded-2xl border border-stone-200 px-3.5 py-3 text-[15px] min-h-[90px] focus:border-[#1D5C56] focus:outline-none focus:ring-2 focus:ring-[#1D5C56]/15"
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
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3.5 rounded-2xl disabled:opacity-60 transition-colors"
              >
                <MessageCircle size={18} /> {t('whatsapp')}
              </button>
              {tipo === 'urgente' && (
                <button
                  type="button"
                  onClick={() => invia('chiamata')}
                  disabled={invio}
                  className="w-full flex items-center justify-center gap-2 bg-[#0E3D3C] hover:bg-[#0A2E2D] text-white font-medium py-3.5 rounded-2xl disabled:opacity-60 transition-colors"
                >
                  <Phone size={18} /> {t('chiama')}
                </button>
              )}
              <button
                type="button"
                onClick={() => invia('sms')}
                disabled={invio}
                className="w-full flex items-center justify-center gap-2 border border-stone-200 text-stone-700 font-medium py-3.5 rounded-2xl disabled:opacity-60 hover:bg-stone-50 transition-colors"
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
