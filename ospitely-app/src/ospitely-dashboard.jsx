import React, { useState, useEffect, useCallback } from 'react';
import {
  Home, CalendarDays, Bell, UserCog, ChevronDown, Plus, Copy, Check,
  X, AlertCircle, Loader2, QrCode, LogOut, Smartphone,
} from 'lucide-react';
import { useOspitely } from './ospitely-app-context.jsx';
import FormOnboardingStruttura from './ospitely-onboarding-form.jsx';
import { generaQRCodePng, costruisciLinkStruttura } from './ospitely-qrcode.js';
import ModaleAggiungiStruttura from './ospitely-aggiungi-struttura.jsx';

// ============================================================
// OSPITELY — Dashboard host
// Mobile-first: barra di navigazione in basso con 4 sezioni fisse
// (Home, Soggiorni, Segnalazioni, Profilo), account in menu secondario.
// Il selettore struttura in header appare solo se l'host ne ha più di una.
// ============================================================

const TAB = { HOME: 'home', SOGGIORNI: 'soggiorni', SEGNALAZIONI: 'segnalazioni', PROFILO: 'profilo' };

const stileInput =
  'w-full rounded-lg border border-stone-300 px-3 py-2.5 text-[15px] text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500';

export default function Dashboard() {
  const { strutturaAttiva, caricamentoStrutture } = useOspitely();
  const [tabAttivo, setTabAttivo] = useState(TAB.HOME);
  const [mostraAccount, setMostraAccount] = useState(false);

  if (caricamentoStrutture) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  if (!strutturaAttiva) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-6 text-center">
        <p className="text-stone-600 mb-1">Nessuna struttura ancora creata</p>
        <p className="text-sm text-stone-400">Crea la tua prima struttura per iniziare</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-stone-50 flex flex-col">
      <IntestazioneStruttura onApriAccount={() => setMostraAccount(true)} />

      <div className="flex-1 overflow-y-auto pb-20">
        {tabAttivo === TAB.HOME && <SezioneHome onCambiaTab={setTabAttivo} />}
        {tabAttivo === TAB.SOGGIORNI && <SezioneSoggiorni />}
        {tabAttivo === TAB.SEGNALAZIONI && <SezioneSegnalazioni />}
        {tabAttivo === TAB.PROFILO && <FormOnboardingStruttura />}
      </div>

      <BarraNavigazione tabAttivo={tabAttivo} onCambia={setTabAttivo} />

      {mostraAccount && <PannelloAccount onChiudi={() => setMostraAccount(false)} />}
    </div>
  );
}

// ============================================================
// Intestazione: selettore struttura (se multi) + icona account
// ============================================================
function IntestazioneStruttura({ onApriAccount }) {
  const { strutture, strutturaAttiva, strutturaAttivaId, impostaStrutturaAttiva, haPiuStrutture } = useOspitely();

  return (
    <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      {haPiuStrutture ? (
        <div className="relative flex-1">
          <select
            className="appearance-none bg-transparent font-semibold text-stone-900 pr-6 focus:outline-none"
            value={strutturaAttivaId}
            onChange={(e) => impostaStrutturaAttiva(e.target.value)}
          >
            {strutture.map((s) => (
              <option key={s.id} value={s.id}>{s.nome_struttura}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        </div>
      ) : (
        <span className="font-semibold text-stone-900">{strutturaAttiva.nome_struttura}</span>
      )}

      <button type="button" onClick={onApriAccount} aria-label="Account e abbonamento">
        <UserCog size={22} className="text-stone-500" />
      </button>
    </header>
  );
}

// ============================================================
// Barra di navigazione in basso
// ============================================================
function BarraNavigazione({ tabAttivo, onCambia }) {
  const voci = [
    { id: TAB.HOME, label: 'Home', Icona: Home },
    { id: TAB.SOGGIORNI, label: 'Soggiorni', Icona: CalendarDays },
    { id: TAB.SEGNALAZIONI, label: 'Segnalazioni', Icona: Bell },
    { id: TAB.PROFILO, label: 'Struttura', Icona: UserCog },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-stone-200 flex">
      {voci.map(({ id, label, Icona }) => {
        const attivo = tabAttivo === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onCambia(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
              attivo ? 'text-stone-900' : 'text-stone-400'
            }`}
          >
            <Icona size={20} strokeWidth={attivo ? 2.4 : 2} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================
// HOME
// ============================================================
function SezioneHome({ onCambiaTab }) {
  const { supabase, strutturaAttiva } = useOspitely();
  const [stato, setStato] = useState({ caricamento: true, nonLette: 0, soggiorniAttivi: 0 });
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [mostraQr, setMostraQr] = useState(false);

  const carica = useCallback(async () => {
    const oggi = new Date().toISOString().slice(0, 10);

    const [{ count: nonLette }, { count: soggiorniAttivi }] = await Promise.all([
      supabase.from('alerts').select('id', { count: 'exact', head: true })
        .eq('property_id', strutturaAttiva.id).eq('letto', false),
      supabase.from('soggiorni').select('id', { count: 'exact', head: true })
        .eq('property_id', strutturaAttiva.id).eq('revocato', false)
        .lte('data_checkin', oggi).gte('data_checkout', oggi),
    ]);

    setStato({ caricamento: false, nonLette: nonLette ?? 0, soggiorniAttivi: soggiorniAttivi ?? 0 });
  }, [supabase, strutturaAttiva.id]);

  useEffect(() => { carica(); }, [carica]);

  async function apriQr() {
    if (!qrDataUrl) {
      const dataUrl = await generaQRCodePng(strutturaAttiva.slug);
      setQrDataUrl(dataUrl);
    }
    setMostraQr(true);
  }

  function apriVersioneStampabile() {
    if (!qrDataUrl) return;
    const finestra = window.open('', '_blank');
    finestra.document.write(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="utf-8">
        <title>${strutturaAttiva.nome_struttura} — QR Ospitely</title>
        <style>
          @page { size: A5; margin: 15mm; }
          body { font-family: system-ui, sans-serif; text-align: center; padding: 40px 20px; }
          .etichetta { letter-spacing: 0.15em; text-transform: uppercase; color: #a8a29e; font-size: 13px; margin-bottom: 4px; }
          h1 { font-size: 24px; margin: 0 0 24px; color: #1c1917; }
          img { width: 260px; height: 260px; margin-bottom: 24px; }
          .principale { font-weight: 500; color: #292524; margin-bottom: 4px; }
          .secondario { font-size: 13px; color: #a8a29e; margin-bottom: 32px; }
          .link { font-size: 11px; color: #a8a29e; word-break: break-all; }
          button { margin-top: 40px; background: #292524; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <p class="etichetta">Ospitely</p>
        <h1>${strutturaAttiva.nome_struttura}</h1>
        <img src="${qrDataUrl}" alt="QR code">
        <p class="principale">Scansiona per parlare con l'assistente</p>
        <p class="secondario">Disponibile in qualsiasi lingua, 24 ore su 24</p>
        <p class="link">${costruisciLinkStruttura(strutturaAttiva.slug)}</p>
        <button onclick="window.print()">Stampa / Salva come PDF</button>
      </body>
      </html>
    `);
    finestra.document.close();
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      {stato.nonLette > 0 && (
        <button
          type="button"
          onClick={() => onCambiaTab(TAB.SEGNALAZIONI)}
          className="w-full flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-left"
        >
          <span className="text-sm font-medium text-red-700">
            🔔 {stato.nonLette} segnalazion{stato.nonLette === 1 ? 'e' : 'i'} non lett{stato.nonLette === 1 ? 'a' : 'e'}
          </span>
          <span className="text-xs text-red-500">Vai →</span>
        </button>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <p className="text-sm text-stone-500 mb-1">Soggiorni attivi ora</p>
        <p className="text-2xl font-semibold text-stone-900">
          {stato.caricamento ? '—' : stato.soggiorniAttivi}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onCambiaTab(TAB.SOGGIORNI)}
          className="flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 text-white text-sm font-medium py-3 rounded-xl"
        >
          <Plus size={16} /> Nuovo soggiorno
        </button>
        <button
          type="button"
          onClick={apriQr}
          className="flex items-center justify-center gap-2 border border-stone-300 text-stone-700 text-sm font-medium py-3 rounded-xl"
        >
          <QrCode size={16} /> QR code
        </button>
      </div>

      {mostraQr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 px-6" onClick={() => setMostraQr(false)}>
          <div className="bg-white rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            {qrDataUrl ? <img src={qrDataUrl} alt="QR code struttura" className="w-56 h-56 mx-auto" /> : <Loader2 className="animate-spin mx-auto" />}
            <p className="text-xs text-stone-500 mt-3 break-all">{costruisciLinkStruttura(strutturaAttiva.slug)}</p>
            <a
              href={qrDataUrl ?? '#'}
              download={`ospitely-${strutturaAttiva.slug}.png`}
              className="block mt-4 bg-stone-800 text-white text-sm font-medium py-2.5 rounded-lg"
            >
              Scarica PNG
            </a>
            <button
              type="button"
              onClick={apriVersioneStampabile}
              className="block w-full mt-2 border border-stone-300 text-stone-700 text-sm font-medium py-2.5 rounded-lg"
            >
              Versione stampabile / PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SOGGIORNI
// ============================================================
function SezioneSoggiorni() {
  const { supabase, strutturaAttiva } = useOspitely();
  const [soggiorni, setSoggiorni] = useState([]);
  const [dispositiviPerSoggiorno, setDispositiviPerSoggiorno] = useState({}); // { [soggiorno_id]: [{device_id, primo_accesso}] }
  const [caricamento, setCaricamento] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [soggiornoInEstensione, setSoggiornoInEstensione] = useState(null);
  const [soggiornoDispositiviAperto, setSoggiornoDispositiviAperto] = useState(null);
  const [copiato, setCopiato] = useState(null);

  const carica = useCallback(async () => {
    setCaricamento(true);
    const { data } = await supabase
      .from('soggiorni')
      .select('*')
      .eq('property_id', strutturaAttiva.id)
      .order('data_checkin', { ascending: false });
    setSoggiorni(data ?? []);

    // Carica in blocco i dispositivi di tutti i soggiorni della struttura,
    // per mostrare subito "n/2" su ogni card senza una richiesta per riga
    if (data?.length) {
      const { data: dispositivi } = await supabase
        .from('soggiorno_dispositivi')
        .select('soggiorno_id, device_id, primo_accesso')
        .in('soggiorno_id', data.map((s) => s.id));

      const raggruppati = {};
      for (const d of dispositivi ?? []) {
        (raggruppati[d.soggiorno_id] ??= []).push(d);
      }
      setDispositiviPerSoggiorno(raggruppati);
    }

    setCaricamento(false);
  }, [supabase, strutturaAttiva.id]);

  useEffect(() => { carica(); }, [carica]);

  function statoSoggiorno(s) {
    const oggi = new Date().toISOString().slice(0, 10);
    if (s.revocato) return { etichetta: 'revocato', colore: 'bg-red-100 text-red-700' };
    if (oggi > s.data_checkout) return { etichetta: 'scaduto', colore: 'bg-stone-100 text-stone-500' };
    if (oggi < s.data_checkin) return { etichetta: 'futuro', colore: 'bg-blue-100 text-blue-700' };
    return { etichetta: 'attivo', colore: 'bg-emerald-100 text-emerald-700' };
  }

  async function revoca(id) {
    await supabase.from('soggiorni').update({ revocato: true }).eq('id', id);
    carica();
  }

  function copia(codice) {
    navigator.clipboard.writeText(codice);
    setCopiato(codice);
    setTimeout(() => setCopiato(null), 1500);
  }

  return (
    <div className="px-4 pt-4 space-y-3">
      <button
        type="button"
        onClick={() => setMostraForm(true)}
        className="w-full flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 text-white text-sm font-medium py-3 rounded-xl"
      >
        <Plus size={16} /> Nuovo soggiorno
      </button>

      {caricamento && <Loader2 className="animate-spin mx-auto text-stone-400 mt-6" />}

      {!caricamento && soggiorni.length === 0 && (
        <p className="text-center text-sm text-stone-400 mt-8">Nessun soggiorno creato ancora</p>
      )}

      {soggiorni.map((s) => {
        const { etichetta, colore } = statoSoggiorno(s);
        const dispositivi = dispositiviPerSoggiorno[s.id] ?? [];
        return (
          <div key={s.id} className="bg-white rounded-xl border border-stone-200 p-3.5">
            <div className="flex items-center justify-between mb-1">
              <button
                type="button"
                onClick={() => copia(s.codice)}
                className="font-mono font-semibold text-stone-900 flex items-center gap-1.5"
              >
                {s.codice} {copiato === s.codice ? <Check size={14} className="text-emerald-600" /> : <Copy size={13} className="text-stone-400" />}
              </button>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colore}`}>{etichetta}</span>
            </div>
            <p className="text-sm text-stone-500 mb-2">
              {formattaData(s.data_checkin)} → {formattaData(s.data_checkout)} · fino a {s.limite_messaggi} messaggi
            </p>
            <button
              type="button"
              onClick={() => setSoggiornoDispositiviAperto({ soggiorno: s, dispositivi })}
              className="text-xs text-stone-500 mb-2 flex items-center gap-1 hover:text-stone-700"
            >
              <Smartphone size={13} /> {dispositivi.length}/2 dispositivi
            </button>
            {etichetta !== 'revocato' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSoggiornoInEstensione(s)}
                  className="text-xs font-medium text-stone-600 border border-stone-300 rounded-lg px-3 py-1.5"
                >
                  Estendi
                </button>
                {etichetta !== 'scaduto' && (
                  <button
                    type="button"
                    onClick={() => revoca(s.id)}
                    className="text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5"
                  >
                    Revoca
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {mostraForm && (
        <ModaleNuovoSoggiorno
          propertyId={strutturaAttiva.id}
          onChiudi={() => setMostraForm(false)}
          onCreato={() => { setMostraForm(false); carica(); }}
        />
      )}

      {soggiornoInEstensione && (
        <ModaleEstendiSoggiorno
          soggiorno={soggiornoInEstensione}
          onChiudi={() => setSoggiornoInEstensione(null)}
          onEsteso={() => { setSoggiornoInEstensione(null); carica(); }}
        />
      )}

      {soggiornoDispositiviAperto && (
        <ModaleDispositivi
          soggiorno={soggiornoDispositiviAperto.soggiorno}
          dispositivi={soggiornoDispositiviAperto.dispositivi}
          onChiudi={() => setSoggiornoDispositiviAperto(null)}
        />
      )}
    </div>
  );
}

function ModaleDispositivi({ soggiorno, dispositivi, onChiudi }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20" onClick={onChiudi}>
      <div className="w-full max-w-md bg-white rounded-t-2xl px-5 pt-4 pb-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-900">Dispositivi · {soggiorno.codice}</h2>
          <button type="button" onClick={onChiudi}><X size={20} className="text-stone-400" /></button>
        </div>

        {dispositivi.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">Nessun dispositivo ha ancora usato questo codice</p>
        ) : (
          <div className="space-y-2">
            {dispositivi.map((d) => (
              <div key={d.device_id} className="flex items-center gap-3 bg-stone-50 rounded-lg p-3">
                <Smartphone size={16} className="text-stone-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-mono text-stone-700 truncate">{d.device_id}</p>
                  <p className="text-xs text-stone-400">Primo accesso: {formattaDataOra(d.primo_accesso)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-stone-400 mt-4">
          Limite massimo 2 dispositivi per codice — il terzo tentativo viene bloccato automaticamente dal sistema.
        </p>
      </div>
    </div>
  );
}

function generaCodiceSoggiorno() {
  const caratteri = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // niente 0/O/1/I, meno ambiguo da leggere
  let codice = '';
  for (let i = 0; i < 6; i++) codice += caratteri[Math.floor(Math.random() * caratteri.length)];
  return codice;
}

function ModaleNuovoSoggiorno({ propertyId, onChiudi, onCreato }) {
  const { supabase } = useOspitely();
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(null);

  async function crea() {
    if (!checkin || !checkout) {
      setErrore('Inserisci entrambe le date');
      return;
    }
    setInvio(true);
    setErrore(null);

    // Fino a 3 tentativi in caso di collisione sul codice (evento raro, 6 caratteri alfanumerici)
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      const { error } = await supabase.from('soggiorni').insert({
        property_id: propertyId,
        codice: generaCodiceSoggiorno(),
        data_checkin: checkin,
        data_checkout: checkout,
      });

      if (!error) {
        onCreato();
        return;
      }
      if (error.code !== '23505') {
        // Non è una collisione di codice: es. capacità raggiunta o durata > 7 notti
        // (messaggio arriva già leggibile dal trigger Postgres)
        setErrore(error.message);
        setInvio(false);
        return;
      }
    }
    setErrore('Errore imprevisto nella generazione del codice, riprova');
    setInvio(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20">
      <div className="w-full max-w-md bg-white rounded-t-2xl px-5 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-900">Nuovo soggiorno</h2>
          <button type="button" onClick={onChiudi}><X size={20} className="text-stone-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Check-in</label>
            <input type="date" className={stileInput} value={checkin} onChange={(e) => setCheckin(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Check-out</label>
            <input type="date" className={stileInput} value={checkout} onChange={(e) => setCheckout(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-stone-500 mb-3">Massimo 7 notti per codice — soggiorni più lunghi richiedono un nuovo codice allo scadere</p>

        {errore && (
          <p className="text-sm text-red-600 flex items-start gap-1.5 mb-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {errore}
          </p>
        )}

        <button
          type="button"
          onClick={crea}
          disabled={invio}
          className="w-full bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
        >
          {invio ? <Loader2 size={18} className="animate-spin" /> : 'Crea codice'}
        </button>
      </div>
    </div>
  );
}

function ModaleEstendiSoggiorno({ soggiorno, onChiudi, onEsteso }) {
  const { supabase } = useOspitely();
  const [nuovoCheckout, setNuovoCheckout] = useState(soggiorno.data_checkout);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(null);

  async function estendi() {
    setInvio(true);
    setErrore(null);

    const { error } = await supabase
      .from('soggiorni')
      .update({ data_checkout: nuovoCheckout })
      .eq('id', soggiorno.id);

    if (error) {
      // Stesso trigger di controllo capacità/durata usato in creazione
      setErrore(error.message);
      setInvio(false);
      return;
    }
    onEsteso();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20">
      <div className="w-full max-w-md bg-white rounded-t-2xl px-5 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-900">Estendi soggiorno {soggiorno.codice}</h2>
          <button type="button" onClick={onChiudi}><X size={20} className="text-stone-400" /></button>
        </div>

        <label className="block text-sm font-medium text-stone-700 mb-1.5">Nuova data check-out</label>
        <input type="date" className={stileInput} value={nuovoCheckout} onChange={(e) => setNuovoCheckout(e.target.value)} />
        <p className="text-xs text-stone-500 mt-2 mb-3">
          Il limite messaggi si aggiorna in automatico in base ai nuovi giorni. Restano validi il massimo di 7 notti totali e la disponibilità camere per il periodo esteso.
        </p>

        {errore && (
          <p className="text-sm text-red-600 flex items-start gap-1.5 mb-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {errore}
          </p>
        )}

        <button
          type="button"
          onClick={estendi}
          disabled={invio}
          className="w-full bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
        >
          {invio ? <Loader2 size={18} className="animate-spin" /> : 'Conferma estensione'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SEGNALAZIONI
// ============================================================
function SezioneSegnalazioni() {
  const { supabase, strutturaAttiva } = useOspitely();
  const [alerts, setAlerts] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [filtro, setFiltro] = useState('tutte'); // tutte | urgente | non_urgente | non_lette
  const [dettaglioAperto, setDettaglioAperto] = useState(null);

  const carica = useCallback(async () => {
    setCaricamento(true);
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('property_id', strutturaAttiva.id)
      .order('created_at', { ascending: false });
    setAlerts(data ?? []);
    setCaricamento(false);
  }, [supabase, strutturaAttiva.id]);

  useEffect(() => { carica(); }, [carica]);

  const filtrati = alerts.filter((a) => {
    if (filtro === 'non_lette') return !a.letto;
    if (filtro === 'urgente' || filtro === 'non_urgente') return a.tipo === filtro;
    return true;
  });

  async function segnaComeLetta(id) {
    await supabase.from('alerts').update({ letto: true }).eq('id', id);
    setAlerts((a) => a.map((x) => (x.id === id ? { ...x, letto: true } : x)));
    setDettaglioAperto((d) => (d?.id === id ? { ...d, letto: true } : d));
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {[
          { id: 'tutte', label: 'Tutte' },
          { id: 'urgente', label: 'Urgenti' },
          { id: 'non_urgente', label: 'Non urgenti' },
          { id: 'non_lette', label: 'Non lette' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border ${
              filtro === f.id ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {caricamento && <Loader2 className="animate-spin mx-auto text-stone-400 mt-6" />}

      {!caricamento && filtrati.length === 0 && (
        <p className="text-center text-sm text-stone-400 mt-8">Nessuna segnalazione</p>
      )}

      <div className="space-y-2">
        {filtrati.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setDettaglioAperto(a)}
            className={`w-full text-left bg-white rounded-xl border p-3.5 ${a.letto ? 'border-stone-200' : 'border-stone-800'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${a.tipo === 'urgente' ? 'text-red-600' : 'text-stone-500'}`}>
                {a.tipo === 'urgente' ? '🚨 Urgente' : 'ℹ️ Non urgente'}
              </span>
              {!a.letto && <span className="w-2 h-2 rounded-full bg-stone-800" />}
            </div>
            <p className="text-sm text-stone-800 truncate">{a.testo}</p>
            <p className="text-xs text-stone-400 mt-1">{formattaDataOra(a.created_at)}</p>
          </button>
        ))}
      </div>

      {dettaglioAperto && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20" onClick={() => setDettaglioAperto(null)}>
          <div className="w-full max-w-md bg-white rounded-t-2xl px-5 pt-4 pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-medium ${dettaglioAperto.tipo === 'urgente' ? 'text-red-600' : 'text-stone-500'}`}>
                {dettaglioAperto.tipo === 'urgente' ? '🚨 Urgente' : 'ℹ️ Non urgente'} · {dettaglioAperto.canale_scelto}
              </span>
              <button type="button" onClick={() => setDettaglioAperto(null)}><X size={20} className="text-stone-400" /></button>
            </div>
            <p className="text-stone-800 mb-2">{dettaglioAperto.testo}</p>
            <p className="text-xs text-stone-400 mb-4">{formattaDataOra(dettaglioAperto.created_at)}</p>
            {!dettaglioAperto.letto && (
              <button
                type="button"
                onClick={() => segnaComeLetta(dettaglioAperto.id)}
                className="w-full bg-stone-800 text-white text-sm font-medium py-2.5 rounded-lg"
              >
                Segna come letta
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Account e abbonamento (menu secondario)
// ============================================================
function PannelloAccount({ onChiudi }) {
  const { profiloHost, sessione, strutturaAttiva, esci } = useOspitely();
  const [caricamentoPortale, setCaricamentoPortale] = useState(false);
  const [erroreP, setErroreP] = useState(null);
  const [mostraAggiungiStruttura, setMostraAggiungiStruttura] = useState(false);

  async function apriPortaleAbbonamento() {
    setCaricamentoPortale(true);
    setErroreP(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/crea-portale-cliente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${sessione.access_token}`,
        },
      });
      const dati = await res.json();

      if (!res.ok) {
        setErroreP(dati.errore ?? 'Errore, riprova');
        setCaricamentoPortale(false);
        return;
      }

      window.location.href = dati.url;
    } catch {
      setErroreP('Errore di connessione, riprova');
      setCaricamentoPortale(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-30" onClick={onChiudi}>
      <div className="w-full max-w-md bg-white rounded-t-2xl px-5 pt-4 pb-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-900">Account e abbonamento</h2>
          <button type="button" onClick={onChiudi}><X size={20} className="text-stone-400" /></button>
        </div>

        <p className="text-sm text-stone-500 mb-1">Nome</p>
        <p className="text-stone-800 mb-4">
          {profiloHost ? `${profiloHost.nome} ${profiloHost.cognome}` : '—'}
        </p>

        <p className="text-sm text-stone-500 mb-1">Email</p>
        <p className="text-stone-800 mb-4">{profiloHost?.email}</p>

        <p className="text-sm text-stone-500 mb-1">Struttura attiva</p>
        <p className="text-stone-800 mb-4">{strutturaAttiva?.nome_struttura} · {strutturaAttiva?.numero_camere} camere</p>

        {erroreP && <p className="text-sm text-red-600 mb-2">{erroreP}</p>}

        <button
          type="button"
          onClick={() => setMostraAggiungiStruttura(true)}
          className="w-full border border-stone-300 text-stone-700 text-sm font-medium py-2.5 rounded-lg mb-2"
        >
          Aggiungi struttura
        </button>

        <button
          type="button"
          onClick={apriPortaleAbbonamento}
          disabled={caricamentoPortale}
          className="w-full flex items-center justify-center gap-2 border border-stone-300 text-stone-700 text-sm font-medium py-2.5 rounded-lg mb-2 disabled:opacity-60"
        >
          {caricamentoPortale ? <Loader2 size={16} className="animate-spin" /> : 'Gestisci abbonamento'}
        </button>
        <button
          type="button"
          onClick={esci}
          className="w-full flex items-center justify-center gap-2 text-red-600 text-sm font-medium py-2.5"
        >
          <LogOut size={16} /> Esci
        </button>

        {mostraAggiungiStruttura && (
          <ModaleAggiungiStruttura onChiudi={() => setMostraAggiungiStruttura(false)} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Utility formattazione date
// ============================================================
function formattaData(iso) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}
function formattaDataOra(iso) {
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
