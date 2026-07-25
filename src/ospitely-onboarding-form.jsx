import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Trash2, Check, Loader2, AlertCircle } from 'lucide-react';
import { useOspitely } from './ospitely-app-context.jsx';

// ============================================================
// OSPITELY — Form di onboarding struttura (property profile)
// Mobile-first, accordion a 10 sezioni, salvataggio indipendente
// per sezione (non serve compilare tutto in un'unica sessione).
// Carica i dati già salvati all'apertura, così l'host li ritrova
// e li modifica invece di doverli riscrivere da capo.
// ============================================================

const SEZIONI = [
  { id: 'dati', label: 'Dati struttura' },
  { id: 'checkin', label: 'Check-in / Check-out' },
  { id: 'colazione', label: 'Colazione', condizionale: true },
  { id: 'wifi', label: 'WiFi e utenze' },
  { id: 'regole', label: 'Regole della casa' },
  { id: 'contatti', label: 'Contatti ed emergenze' },
  { id: 'trasporti', label: 'Mezzi e trasporti' },
  { id: 'consigli', label: 'Consigli locali' },
  { id: 'faq', label: 'Domande frequenti' },
  { id: 'lingua', label: 'Lingua e tono' },
];

const TIPI_CON_COLAZIONE = ['hotel', 'b&b', 'affittacamere'];

const OPZIONI_COLAZIONE_TIPO = [
  { valore: 'dolce', etichetta: 'Dolce' },
  { valore: 'salata', etichetta: 'Salata' },
  { valore: 'internazionale', etichetta: 'Internazionale' },
  { valore: 'self_service', etichetta: 'Self-service' },
  { valore: 'servita', etichetta: 'Servita' },
];

const stileInput =
  'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[15px] text-stone-800 placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15 transition-shadow';
const stileLabel = 'block text-sm font-medium text-stone-700 mb-1.5';
const stileSelect = stileInput + ' bg-white';

function Campo({ label, children, aiuto }) {
  return (
    <div className="mb-4">
      <label className={stileLabel}>{label}</label>
      {children}
      {aiuto && <p className="mt-1 text-xs text-stone-500">{aiuto}</p>}
    </div>
  );
}

function RigaRipetibile({ children, onRimuovi }) {
  return (
    <div className="flex items-start gap-2 mb-3 rounded-lg bg-stone-50 p-3 border border-stone-200">
      <div className="flex-1 space-y-2">{children}</div>
      <button
        type="button"
        onClick={onRimuovi}
        className="mt-1 text-stone-400 hover:text-red-600 transition-colors"
        aria-label="Rimuovi"
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}

function BottoneAggiungi({ onClick, testo }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm font-medium text-stone-700 hover:text-stone-900 border border-dashed border-stone-300 hover:border-stone-400 rounded-lg px-3 py-2 w-full justify-center transition-colors"
    >
      <Plus size={16} /> {testo}
    </button>
  );
}

export default function FormOnboardingStruttura() {
  const { supabase, strutturaAttiva } = useOspitely();

  const [sezioneAperta, setSezioneAperta] = useState('dati');
  const [salvataggio, setSalvataggio] = useState({}); // { [sezioneId]: 'idle' | 'salvando' | 'salvato' | 'errore' }
  const [caricamentoIniziale, setCaricamentoIniziale] = useState(true);

  const [dati, setDati] = useState({
    nomeStruttura: '',
    tipoStruttura: '',
    indirizzo: '',
    pianoCitofono: '',
  });
  const [checkin, setCheckin] = useState({
    checkinDa: '', checkinA: '', checkinLateDisponibile: false, checkinLateAPagamento: false,
    checkoutA: '', checkoutLateDisponibile: false, checkoutLateAPagamento: false,
    modalita: '', istruzioni: '', videoUrl: '',
  });
  const [colazione, setColazione] = useState({
    orarioDa: '', orarioA: '', dove: '', tipo: [], note: '',
  });
  const [wifi, setWifi] = useState({ nomeRete: '', password: '', noteUtenze: '' });
  const [regole, setRegole] = useState({
    orarioSilenzio: '', policyFumo: '', policyAnimali: '', policyOspitiEsterni: '', altreRegole: '',
  });
  const [contatti, setContatti] = useState({
    numeroEmergenze: '', whatsappHost: '', contattiExtra: [],
  });
  const [trasporti, setTrasporti] = useState({
    bus: '', stazione: '', aeroporto: '', parcheggio: '',
  });
  const [consigli, setConsigli] = useState([]);
  const [faq, setFaq] = useState([]);
  const [lingua, setLingua] = useState({
    tono: 'amichevole',
    modalitaLingua: 'auto_rilevamento',
    linguaAggiuntiva: '',
    noteTraduzione: '',
  });

  // Carica i dati già salvati (properties + property_profile) ogni volta
  // che la struttura attiva cambia, così l'host ritrova quello che ha
  // già scritto invece di vedere il form vuoto dopo aver salvato.
  useEffect(() => {
    if (!strutturaAttiva) return;
    let annullato = false;

    async function carica() {
      setCaricamentoIniziale(true);

      const [{ data: proprieta }, { data: profilo }] = await Promise.all([
        supabase.from('properties').select('*').eq('id', strutturaAttiva.id).single(),
        supabase.from('property_profile').select('*').eq('property_id', strutturaAttiva.id).maybeSingle(),
      ]);

      if (annullato) return;

      if (proprieta) {
        setDati({
          nomeStruttura: proprieta.nome_struttura ?? '',
          tipoStruttura: proprieta.tipo_struttura ?? '',
          indirizzo: proprieta.indirizzo ?? '',
          pianoCitofono: proprieta.piano_interno_citofono ?? '',
        });
      }

      if (profilo) {
        setCheckin({
          checkinDa: profilo.checkin_orario_da ?? '',
          checkinA: profilo.checkin_orario_a ?? '',
          checkinLateDisponibile: profilo.checkin_late_disponibile ?? false,
          checkinLateAPagamento: profilo.checkin_late_a_pagamento ?? false,
          checkoutA: profilo.checkout_orario_a ?? '',
          checkoutLateDisponibile: profilo.checkout_late_disponibile ?? false,
          checkoutLateAPagamento: profilo.checkout_late_a_pagamento ?? false,
          modalita: profilo.checkin_modalita ?? '',
          istruzioni: profilo.istruzioni_accesso ?? '',
          videoUrl: profilo.video_istruzioni_url ?? '',
        });
        setColazione({
          orarioDa: profilo.colazione_orario_da ?? '',
          orarioA: profilo.colazione_orario_a ?? '',
          dove: profilo.colazione_dove ?? '',
          tipo: Array.isArray(profilo.colazione_tipo) ? profilo.colazione_tipo : [],
          note: profilo.colazione_note ?? '',
        });
        setWifi({
          nomeRete: profilo.wifi_nome_rete ?? '',
          password: profilo.wifi_password ?? '',
          noteUtenze: profilo.note_utenze ?? '',
        });
        setRegole({
          orarioSilenzio: profilo.orario_silenzio ?? '',
          policyFumo: profilo.policy_fumo ?? '',
          policyAnimali: profilo.policy_animali ?? '',
          policyOspitiEsterni: profilo.policy_ospiti_esterni ?? '',
          altreRegole: profilo.altre_regole ?? '',
        });
        setContatti({
          numeroEmergenze: profilo.numero_emergenze ?? '',
          whatsappHost: profilo.whatsapp_host ?? '',
          contattiExtra: Array.isArray(profilo.contatti_extra) ? profilo.contatti_extra : [],
        });
        setTrasporti({
          bus: profilo.fermata_bus_info ?? '',
          stazione: profilo.stazione_info ?? '',
          aeroporto: profilo.aeroporto_info ?? '',
          parcheggio: profilo.parcheggio_info ?? '',
        });
        setConsigli(Array.isArray(profilo.consigli_locali) ? profilo.consigli_locali : []);
        setFaq(Array.isArray(profilo.faq) ? profilo.faq : []);
        setLingua({
          tono: profilo.tono_assistente ?? 'amichevole',
          modalitaLingua: profilo.modalita_lingua ?? 'auto_rilevamento',
          linguaAggiuntiva: profilo.lingua_aggiuntiva ?? '',
          noteTraduzione: profilo.note_traduzione ?? '',
        });
      }

      setCaricamentoIniziale(false);
    }

    carica();
    return () => { annullato = true; };
  }, [strutturaAttiva, supabase]);

  const mostraColazione = TIPI_CON_COLAZIONE.includes(dati.tipoStruttura);

  // Converte lo stato locale (camelCase) nelle colonne reali dello schema
  // (snake_case) — un mapping per sezione, così ogni pezzo di stato sa
  // esattamente dove finisce nel database.
  function mappaVersoDb(sezioneId) {
    switch (sezioneId) {
      case 'dati':
        return {
          tabella: 'properties',
          modalita: 'update',
          payload: {
            nome_struttura: dati.nomeStruttura,
            tipo_struttura: dati.tipoStruttura,
            indirizzo: dati.indirizzo,
            piano_interno_citofono: dati.pianoCitofono,
          },
        };
      case 'checkin':
        return {
          tabella: 'property_profile',
          modalita: 'upsert',
          payload: {
            checkin_orario_da: checkin.checkinDa || null,
            checkin_orario_a: checkin.checkinA || null,
            checkin_late_disponibile: checkin.checkinLateDisponibile,
            checkin_late_a_pagamento: checkin.checkinLateAPagamento,
            checkout_orario_a: checkin.checkoutA || null,
            checkout_late_disponibile: checkin.checkoutLateDisponibile,
            checkout_late_a_pagamento: checkin.checkoutLateAPagamento,
            checkin_modalita: checkin.modalita || null,
            istruzioni_accesso: checkin.istruzioni,
            video_istruzioni_url: checkin.videoUrl,
          },
        };
      case 'colazione':
        return {
          tabella: 'property_profile',
          modalita: 'upsert',
          payload: {
            colazione_orario_da: colazione.orarioDa || null,
            colazione_orario_a: colazione.orarioA || null,
            colazione_dove: colazione.dove || null,
            colazione_tipo: colazione.tipo,
            colazione_note: colazione.note,
          },
        };
      case 'wifi':
        return {
          tabella: 'property_profile',
          modalita: 'upsert',
          payload: {
            wifi_nome_rete: wifi.nomeRete,
            wifi_password: wifi.password,
            note_utenze: wifi.noteUtenze,
          },
        };
      case 'regole':
        return {
          tabella: 'property_profile',
          modalita: 'upsert',
          payload: {
            orario_silenzio: regole.orarioSilenzio,
            policy_fumo: regole.policyFumo,
            policy_animali: regole.policyAnimali,
            policy_ospiti_esterni: regole.policyOspitiEsterni,
            altre_regole: regole.altreRegole,
          },
        };
      case 'contatti':
        return {
          tabella: 'property_profile',
          modalita: 'upsert',
          payload: {
            numero_emergenze: contatti.numeroEmergenze,
            whatsapp_host: contatti.whatsappHost,
            contatti_extra: contatti.contattiExtra,
          },
        };
      case 'trasporti':
        return {
          tabella: 'property_profile',
          modalita: 'upsert',
          payload: {
            fermata_bus_info: trasporti.bus,
            stazione_info: trasporti.stazione,
            aeroporto_info: trasporti.aeroporto,
            parcheggio_info: trasporti.parcheggio,
          },
        };
      case 'consigli':
        return {
          tabella: 'property_profile',
          modalita: 'upsert',
          payload: { consigli_locali: consigli },
        };
      case 'faq':
        return {
          tabella: 'property_profile',
          modalita: 'upsert',
          payload: { faq },
        };
      case 'lingua':
        return {
          tabella: 'property_profile',
          modalita: 'upsert',
          payload: {
            tono_assistente: lingua.tono,
            modalita_lingua: lingua.modalitaLingua,
            lingua_aggiuntiva: lingua.modalitaLingua === 'italiano_piu_una' ? lingua.linguaAggiuntiva : null,
            note_traduzione: lingua.noteTraduzione,
          },
        };
      default:
        throw new Error(`Sezione sconosciuta: ${sezioneId}`);
    }
  }

  async function salvaSezione(sezioneId) {
    if (!strutturaAttiva) {
      setSalvataggio((s) => ({ ...s, [sezioneId]: 'errore' }));
      return;
    }

    setSalvataggio((s) => ({ ...s, [sezioneId]: 'salvando' }));

    const { tabella, modalita, payload } = mappaVersoDb(sezioneId);

    const { error } =
      modalita === 'update'
        ? await supabase.from(tabella).update(payload).eq('id', strutturaAttiva.id)
        : await supabase
            .from(tabella)
            .upsert({ property_id: strutturaAttiva.id, ...payload }, { onConflict: 'property_id' });

    if (error) {
      console.error(`Errore salvataggio sezione "${sezioneId}":`, error);
      setSalvataggio((s) => ({ ...s, [sezioneId]: 'errore' }));
      return;
    }

    setSalvataggio((s) => ({ ...s, [sezioneId]: 'salvato' }));
    setTimeout(() => setSalvataggio((s) => ({ ...s, [sezioneId]: 'idle' })), 2000);
  }

  function StatoSalvataggio({ sezioneId }) {
    const stato = salvataggio[sezioneId] ?? 'idle';
    if (stato === 'salvando') {
      return (
        <span className="flex items-center gap-1.5 text-sm text-stone-500">
          <Loader2 size={14} className="animate-spin" /> Salvataggio...
        </span>
      );
    }
    if (stato === 'salvato') {
      return (
        <span className="flex items-center gap-1.5 text-sm text-emerald-700">
          <Check size={14} /> Salvato
        </span>
      );
    }
    if (stato === 'errore') {
      return (
        <span className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={14} /> Errore, riprova
        </span>
      );
    }
    return null;
  }

  function BottoneSalva({ sezioneId }) {
    return (
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
        <StatoSalvataggio sezioneId={sezioneId} />
        <button
          type="button"
          onClick={() => salvaSezione(sezioneId)}
          className="ml-auto bg-stone-800 hover:bg-stone-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Salva sezione
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-[#F7F5F1] min-h-screen pb-10">
      <header className="bg-white border-b border-stone-200/70 px-5 py-5 sticky top-0 z-10">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-teal-700 uppercase mb-1">Profilo struttura</p>
        <h1 className="text-xl font-semibold text-stone-900">{strutturaAttiva?.nome_struttura || 'La tua struttura'}</h1>
        <p className="text-sm text-stone-500 mt-1">
          Ogni sezione si salva da sola — puoi completarle quando vuoi
        </p>
      </header>

      {!strutturaAttiva && (
        <div className="mx-4 mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          Nessuna struttura selezionata — crea prima una struttura (nome e slug) per poter salvare il profilo.
        </div>
      )}

      {strutturaAttiva && caricamentoIniziale && (
        <div className="flex items-center justify-center gap-2 text-sm text-stone-400 py-10">
          <Loader2 size={16} className="animate-spin" /> Carico i dati salvati...
        </div>
      )}

      {strutturaAttiva && !caricamentoIniziale && (
      <div className="px-4 pt-4 space-y-2.5">
        {SEZIONI.filter((s) => !s.condizionale || mostraColazione).map((sezione) => {
          const aperta = sezioneAperta === sezione.id;
          return (
            <div key={sezione.id} className={`bg-white rounded-2xl border overflow-hidden transition-colors ${aperta ? 'border-teal-600/30 shadow-sm shadow-teal-900/5' : 'border-stone-200'}`}>
              <button
                type="button"
                onClick={() => setSezioneAperta(aperta ? null : sezione.id)}
                className="w-full flex items-center justify-between px-4 py-4 text-left"
              >
                <span className={`font-medium ${aperta ? 'text-teal-800' : 'text-stone-800'}`}>{sezione.label}</span>
                <ChevronDown
                  size={18}
                  className={`transition-transform ${aperta ? 'rotate-180 text-teal-700' : 'text-stone-400'}`}
                />
              </button>

              {aperta && (
                <div className="px-4 pb-4">
                  {/* ---------- DATI STRUTTURA ---------- */}
                  {sezione.id === 'dati' && (
                    <>
                      <Campo label="Nome struttura">
                        <input
                          className={stileInput}
                          value={dati.nomeStruttura}
                          onChange={(e) => setDati({ ...dati, nomeStruttura: e.target.value })}
                          placeholder="Es. Hotel Bellavista"
                        />
                      </Campo>
                      <Campo label="Tipo struttura">
                        <select
                          className={stileSelect}
                          value={dati.tipoStruttura}
                          onChange={(e) => setDati({ ...dati, tipoStruttura: e.target.value })}
                        >
                          <option value="">Seleziona...</option>
                          <option value="hotel">Hotel</option>
                          <option value="b&b">B&B</option>
                          <option value="affittacamere">Affittacamere</option>
                          <option value="affitto_turistico">Affitto turistico</option>
                          <option value="casa_vacanze">Casa vacanze</option>
                        </select>
                      </Campo>
                      <Campo label="Indirizzo completo">
                        <input
                          className={stileInput}
                          value={dati.indirizzo}
                          onChange={(e) => setDati({ ...dati, indirizzo: e.target.value })}
                        />
                      </Campo>
                      <Campo label="Piano / interno / citofono" aiuto="Facoltativo, utile per le indicazioni agli ospiti">
                        <input
                          className={stileInput}
                          value={dati.pianoCitofono}
                          onChange={(e) => setDati({ ...dati, pianoCitofono: e.target.value })}
                        />
                      </Campo>
                      <BottoneSalva sezioneId="dati" />
                    </>
                  )}

                  {/* ---------- CHECK-IN / CHECK-OUT ---------- */}
                  {sezione.id === 'checkin' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Campo label="Check-in dalle">
                          <input type="time" className={stileInput} value={checkin.checkinDa}
                            onChange={(e) => setCheckin({ ...checkin, checkinDa: e.target.value })} />
                        </Campo>
                        <Campo label="alle">
                          <input type="time" className={stileInput} value={checkin.checkinA}
                            onChange={(e) => setCheckin({ ...checkin, checkinA: e.target.value })} />
                        </Campo>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-stone-700 mb-2">
                        <input type="checkbox" checked={checkin.checkinLateDisponibile}
                          onChange={(e) => setCheckin({ ...checkin, checkinLateDisponibile: e.target.checked })} />
                        Late check-in disponibile
                      </label>
                      {checkin.checkinLateDisponibile && (
                        <label className="flex items-center gap-2 text-sm text-stone-700 mb-4 ml-5">
                          <input type="checkbox" checked={checkin.checkinLateAPagamento}
                            onChange={(e) => setCheckin({ ...checkin, checkinLateAPagamento: e.target.checked })} />
                          A pagamento
                        </label>
                      )}

                      <Campo label="Check-out entro le">
                        <input type="time" className={stileInput} value={checkin.checkoutA}
                          onChange={(e) => setCheckin({ ...checkin, checkoutA: e.target.value })} />
                      </Campo>
                      <label className="flex items-center gap-2 text-sm text-stone-700 mb-2">
                        <input type="checkbox" checked={checkin.checkoutLateDisponibile}
                          onChange={(e) => setCheckin({ ...checkin, checkoutLateDisponibile: e.target.checked })} />
                        Late check-out disponibile
                      </label>
                      {checkin.checkoutLateDisponibile && (
                        <label className="flex items-center gap-2 text-sm text-stone-700 mb-4 ml-5">
                          <input type="checkbox" checked={checkin.checkoutLateAPagamento}
                            onChange={(e) => setCheckin({ ...checkin, checkoutLateAPagamento: e.target.checked })} />
                          A pagamento
                        </label>
                      )}

                      <Campo label="Modalità check-in">
                        <select className={stileSelect} value={checkin.modalita}
                          onChange={(e) => setCheckin({ ...checkin, modalita: e.target.value })}>
                          <option value="">Seleziona...</option>
                          <option value="self_checkin">Self check-in con codice</option>
                          <option value="accoglienza_persona">Accoglienza di persona</option>
                          <option value="altro">Altro</option>
                        </select>
                      </Campo>
                      <Campo label="Istruzioni di accesso" aiuto="Es. codice cassetta chiavi, come raggiungere l'ingresso">
                        <textarea className={stileInput + ' min-h-[80px]'} value={checkin.istruzioni}
                          onChange={(e) => setCheckin({ ...checkin, istruzioni: e.target.value })} />
                      </Campo>
                      <Campo label="Link video istruzioni" aiuto="Facoltativo">
                        <input className={stileInput} value={checkin.videoUrl}
                          onChange={(e) => setCheckin({ ...checkin, videoUrl: e.target.value })}
                          placeholder="https://..." />
                      </Campo>
                      <BottoneSalva sezioneId="checkin" />
                    </>
                  )}

                  {/* ---------- COLAZIONE ---------- */}
                  {sezione.id === 'colazione' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Campo label="Dalle">
                          <input type="time" className={stileInput} value={colazione.orarioDa}
                            onChange={(e) => setColazione({ ...colazione, orarioDa: e.target.value })} />
                        </Campo>
                        <Campo label="Alle">
                          <input type="time" className={stileInput} value={colazione.orarioA}
                            onChange={(e) => setColazione({ ...colazione, orarioA: e.target.value })} />
                        </Campo>
                      </div>
                      <Campo label="Dove si svolge">
                        <select className={stileSelect} value={colazione.dove}
                          onChange={(e) => setColazione({ ...colazione, dove: e.target.value })}>
                          <option value="">Seleziona...</option>
                          <option value="sala_interna">Sala interna</option>
                          <option value="bar_convenzionato">Bar convenzionato esterno</option>
                          <option value="in_camera">In camera</option>
                        </select>
                      </Campo>
                      <Campo label="Tipo colazione" aiuto="Seleziona tutte le opzioni che offri">
                        <div className="grid grid-cols-2 gap-2">
                          {OPZIONI_COLAZIONE_TIPO.map((opzione) => {
                            const selezionata = colazione.tipo.includes(opzione.valore);
                            return (
                              <label
                                key={opzione.valore}
                                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                                  selezionata ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-stone-200 text-stone-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="accent-teal-600"
                                  checked={selezionata}
                                  onChange={(e) => {
                                    const nuovo = e.target.checked
                                      ? [...colazione.tipo, opzione.valore]
                                      : colazione.tipo.filter((t) => t !== opzione.valore);
                                    setColazione({ ...colazione, tipo: nuovo });
                                  }}
                                />
                                {opzione.etichetta}
                              </label>
                            );
                          })}
                        </div>
                      </Campo>
                      <Campo label="Note" aiuto="Es. intolleranze gestibili, opzioni vegane">
                        <textarea className={stileInput + ' min-h-[70px]'} value={colazione.note}
                          onChange={(e) => setColazione({ ...colazione, note: e.target.value })} />
                      </Campo>
                      <BottoneSalva sezioneId="colazione" />
                    </>
                  )}

                  {/* ---------- WIFI ---------- */}
                  {sezione.id === 'wifi' && (
                    <>
                      <Campo label="Nome rete WiFi">
                        <input className={stileInput} value={wifi.nomeRete}
                          onChange={(e) => setWifi({ ...wifi, nomeRete: e.target.value })} />
                      </Campo>
                      <Campo label="Password WiFi">
                        <input className={stileInput} value={wifi.password}
                          onChange={(e) => setWifi({ ...wifi, password: e.target.value })} />
                      </Campo>
                      <Campo label="Note TV / clima / riscaldamento" aiuto="Facoltativo">
                        <textarea className={stileInput + ' min-h-[70px]'} value={wifi.noteUtenze}
                          onChange={(e) => setWifi({ ...wifi, noteUtenze: e.target.value })} />
                      </Campo>
                      <BottoneSalva sezioneId="wifi" />
                    </>
                  )}

                  {/* ---------- REGOLE DELLA CASA ---------- */}
                  {sezione.id === 'regole' && (
                    <>
                      <Campo label="Orario silenzio">
                        <input className={stileInput} value={regole.orarioSilenzio}
                          onChange={(e) => setRegole({ ...regole, orarioSilenzio: e.target.value })}
                          placeholder="Es. 22:00 - 08:00" />
                      </Campo>
                      <Campo label="Policy fumo">
                        <input className={stileInput} value={regole.policyFumo}
                          onChange={(e) => setRegole({ ...regole, policyFumo: e.target.value })} />
                      </Campo>
                      <Campo label="Policy animali">
                        <input className={stileInput} value={regole.policyAnimali}
                          onChange={(e) => setRegole({ ...regole, policyAnimali: e.target.value })} />
                      </Campo>
                      <Campo label="Policy ospiti esterni / visite">
                        <input className={stileInput} value={regole.policyOspitiEsterni}
                          onChange={(e) => setRegole({ ...regole, policyOspitiEsterni: e.target.value })} />
                      </Campo>
                      <Campo label="Altre regole" aiuto="Campo libero, facoltativo">
                        <textarea className={stileInput + ' min-h-[70px]'} value={regole.altreRegole}
                          onChange={(e) => setRegole({ ...regole, altreRegole: e.target.value })} />
                      </Campo>
                      <BottoneSalva sezioneId="regole" />
                    </>
                  )}

                  {/* ---------- CONTATTI ED EMERGENZE ---------- */}
                  {sezione.id === 'contatti' && (
                    <>
                      <Campo label="Numero host per emergenze">
                        <input className={stileInput} value={contatti.numeroEmergenze}
                          onChange={(e) => setContatti({ ...contatti, numeroEmergenze: e.target.value })}
                          placeholder="+39 ..." />
                      </Campo>
                      <Campo label="WhatsApp host" aiuto="Può coincidere con il numero sopra">
                        <input className={stileInput} value={contatti.whatsappHost}
                          onChange={(e) => setContatti({ ...contatti, whatsappHost: e.target.value })}
                          placeholder="+39 ..." />
                      </Campo>

                      <label className={stileLabel}>Contatti utili extra</label>
                      {contatti.contattiExtra.map((c, i) => (
                        <RigaRipetibile key={i} onRimuovi={() => {
                          const copia = [...contatti.contattiExtra];
                          copia.splice(i, 1);
                          setContatti({ ...contatti, contattiExtra: copia });
                        }}>
                          <input className={stileInput} placeholder="Nome (es. Medico convenzionato)"
                            value={c.nome} onChange={(e) => {
                              const copia = [...contatti.contattiExtra];
                              copia[i] = { ...copia[i], nome: e.target.value };
                              setContatti({ ...contatti, contattiExtra: copia });
                            }} />
                          <input className={stileInput} placeholder="Contatto"
                            value={c.contatto} onChange={(e) => {
                              const copia = [...contatti.contattiExtra];
                              copia[i] = { ...copia[i], contatto: e.target.value };
                              setContatti({ ...contatti, contattiExtra: copia });
                            }} />
                        </RigaRipetibile>
                      ))}
                      <BottoneAggiungi testo="Aggiungi contatto"
                        onClick={() => setContatti({
                          ...contatti,
                          contattiExtra: [...contatti.contattiExtra, { nome: '', contatto: '' }],
                        })} />
                      <BottoneSalva sezioneId="contatti" />
                    </>
                  )}

                  {/* ---------- MEZZI E TRASPORTI ---------- */}
                  {sezione.id === 'trasporti' && (
                    <>
                      <Campo label="Fermata bus/tram più vicina" aiuto="Includi le linee utili">
                        <textarea className={stileInput + ' min-h-[60px]'} value={trasporti.bus}
                          onChange={(e) => setTrasporti({ ...trasporti, bus: e.target.value })} />
                      </Campo>
                      <Campo label="Come raggiungere la stazione">
                        <textarea className={stileInput + ' min-h-[60px]'} value={trasporti.stazione}
                          onChange={(e) => setTrasporti({ ...trasporti, stazione: e.target.value })} />
                      </Campo>
                      <Campo label="Come raggiungere l'aeroporto">
                        <textarea className={stileInput + ' min-h-[60px]'} value={trasporti.aeroporto}
                          onChange={(e) => setTrasporti({ ...trasporti, aeroporto: e.target.value })} />
                      </Campo>
                      <Campo label="Parcheggio" aiuto="Disponibilità, dove, gratuito o a pagamento">
                        <textarea className={stileInput + ' min-h-[60px]'} value={trasporti.parcheggio}
                          onChange={(e) => setTrasporti({ ...trasporti, parcheggio: e.target.value })} />
                      </Campo>
                      <BottoneSalva sezioneId="trasporti" />
                    </>
                  )}

                  {/* ---------- CONSIGLI LOCALI ---------- */}
                  {sezione.id === 'consigli' && (
                    <>
                      {consigli.map((c, i) => (
                        <RigaRipetibile key={i} onRimuovi={() => {
                          const copia = [...consigli];
                          copia.splice(i, 1);
                          setConsigli(copia);
                        }}>
                          <select className={stileSelect} value={c.categoria}
                            onChange={(e) => {
                              const copia = [...consigli];
                              copia[i] = { ...copia[i], categoria: e.target.value };
                              setConsigli(copia);
                            }}>
                            <option value="">Categoria...</option>
                            <option value="ristorante">Ristorante</option>
                            <option value="bar">Bar / caffè</option>
                            <option value="attrazione">Attrazione</option>
                            <option value="servizio">Supermercato / farmacia / bancomat</option>
                          </select>
                          <input className={stileInput} placeholder="Nome"
                            value={c.nome} onChange={(e) => {
                              const copia = [...consigli];
                              copia[i] = { ...copia[i], nome: e.target.value };
                              setConsigli(copia);
                            }} />
                          <input className={stileInput} placeholder="Nota (es. economico, tipico)"
                            value={c.nota} onChange={(e) => {
                              const copia = [...consigli];
                              copia[i] = { ...copia[i], nota: e.target.value };
                              setConsigli(copia);
                            }} />
                        </RigaRipetibile>
                      ))}
                      <BottoneAggiungi testo="Aggiungi consiglio"
                        onClick={() => setConsigli([...consigli, { categoria: '', nome: '', nota: '' }])} />
                      <BottoneSalva sezioneId="consigli" />
                    </>
                  )}

                  {/* ---------- FAQ ---------- */}
                  {sezione.id === 'faq' && (
                    <>
                      {faq.map((f, i) => (
                        <RigaRipetibile key={i} onRimuovi={() => {
                          const copia = [...faq];
                          copia.splice(i, 1);
                          setFaq(copia);
                        }}>
                          <input className={stileInput} placeholder="Domanda tipica degli ospiti"
                            value={f.domanda} onChange={(e) => {
                              const copia = [...faq];
                              copia[i] = { ...copia[i], domanda: e.target.value };
                              setFaq(copia);
                            }} />
                          <textarea className={stileInput + ' min-h-[60px]'} placeholder="Risposta"
                            value={f.risposta} onChange={(e) => {
                              const copia = [...faq];
                              copia[i] = { ...copia[i], risposta: e.target.value };
                              setFaq(copia);
                            }} />
                        </RigaRipetibile>
                      ))}
                      <BottoneAggiungi testo="Aggiungi domanda frequente"
                        onClick={() => setFaq([...faq, { domanda: '', risposta: '' }])} />
                      <BottoneSalva sezioneId="faq" />
                    </>
                  )}

                  {/* ---------- LINGUA E TONO ---------- */}
                  {sezione.id === 'lingua' && (
                    <>
                      <Campo label="Tono dell'assistente">
                        <select className={stileSelect} value={lingua.tono}
                          onChange={(e) => setLingua({ ...lingua, tono: e.target.value })}>
                          <option value="formale">Formale</option>
                          <option value="amichevole">Amichevole</option>
                          <option value="informale">Informale</option>
                        </select>
                      </Campo>

                      <Campo label="Lingue supportate">
                        <div className="space-y-2">
                          <label className="flex items-start gap-2 text-sm text-stone-700">
                            <input type="radio" name="modalitaLingua" className="mt-1"
                              checked={lingua.modalitaLingua === 'auto_rilevamento'}
                              onChange={() => setLingua({ ...lingua, modalitaLingua: 'auto_rilevamento' })} />
                            <span>Riconoscimento automatico dalla lingua del telefono dell'ospite (consigliato)</span>
                          </label>
                          <label className="flex items-start gap-2 text-sm text-stone-700">
                            <input type="radio" name="modalitaLingua" className="mt-1"
                              checked={lingua.modalitaLingua === 'italiano_piu_una'}
                              onChange={() => setLingua({ ...lingua, modalitaLingua: 'italiano_piu_una' })} />
                            <span>Solo italiano + un'altra lingua a mia scelta</span>
                          </label>
                        </div>
                      </Campo>

                      {lingua.modalitaLingua === 'italiano_piu_una' && (
                        <Campo label="Lingua aggiuntiva">
                          <input className={stileInput} value={lingua.linguaAggiuntiva}
                            onChange={(e) => setLingua({ ...lingua, linguaAggiuntiva: e.target.value })}
                            placeholder="Es. Inglese" />
                        </Campo>
                      )}

                      <Campo
                        label="Note per la traduzione"
                        aiuto="Usa questo campo per dare istruzioni su come Claude deve tradurre le tue risposte — es. termini da non tradurre, un tono più formale in altre lingue, ecc. I nomi propri di locali e attività non vengono comunque mai tradotti, a prescindere da queste note."
                      >
                        <textarea className={stileInput + ' min-h-[80px]'} value={lingua.noteTraduzione}
                          onChange={(e) => setLingua({ ...lingua, noteTraduzione: e.target.value })} />
                      </Campo>
                      <BottoneSalva sezioneId="lingua" />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
