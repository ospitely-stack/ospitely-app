import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// OSPITELY — Fondamenta condivise del frontend host
// Client Supabase, sessione host (magic link), struttura attiva.
// Ogni pezzo di frontend (form onboarding, dashboard, ecc.) legge
// e scrive attraverso questo contesto, invece di reinventarlo.
// ============================================================

// SUPABASE: valorizzare con le variabili reali del progetto
// (chiave "anon", MAI la service_role key lato client)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const OspitelyContext = createContext(null);

const CHIAVE_STRUTTURA_ATTIVA = 'ospitely_struttura_attiva_id';

export function OspitelyProvider({ children }) {
  const [sessione, setSessione] = useState(undefined); // undefined = sto ancora controllando, null = non loggato
  const [profiloHost, setProfiloHost] = useState(null); // riga vera della tabella hosts (nome, cognome, ecc.)
  const [strutture, setStrutture] = useState([]);
  const [strutturaAttivaId, setStrutturaAttivaId] = useState(
    () => localStorage.getItem(CHIAVE_STRUTTURA_ATTIVA) || null
  );
  const [caricamentoStrutture, setCaricamentoStrutture] = useState(false);

  // --- Sessione host: controlla subito, poi resta in ascolto dei cambi ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessione(data.session ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nuovaSessione) => {
      setSessione(nuovaSessione);
      if (!nuovaSessione) {
        setStrutture([]);
        setProfiloHost(null);
        setStrutturaAttivaId(null);
        localStorage.removeItem(CHIAVE_STRUTTURA_ATTIVA);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // --- Carica il profilo host vero (tabella hosts) non appena c'è una sessione.
  // sessione.user (Supabase Auth) NON contiene nome/cognome/telefono/max_properties:
  // quei dati vivono solo nella tabella hosts, vanno recuperati esplicitamente. ---
  useEffect(() => {
    if (!sessione) return;

    supabase
      .from('hosts')
      .select('id, nome, cognome, email, telefono_whatsapp, max_properties, is_multi_struttura, stato_abbonamento')
      .eq('id', sessione.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Errore nel caricamento profilo host:', error);
          return;
        }
        setProfiloHost(data);
      });
  }, [sessione]);

  // --- Carica le strutture dell'host non appena c'è una sessione ---
  useEffect(() => {
    if (!sessione) return;

    setCaricamentoStrutture(true);
    supabase
      .from('properties')
      .select('id, nome_struttura, slug, tipo_struttura, numero_camere, attiva')
      .eq('host_id', sessione.user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Errore nel caricamento strutture:', error);
          setCaricamentoStrutture(false);
          return;
        }
        setStrutture(data ?? []);

        // Se non c'è ancora una struttura attiva valida, seleziona la prima
        const idSalvatoValido = data?.some((s) => s.id === strutturaAttivaId);
        if (!idSalvatoValido && data?.length > 0) {
          impostaStrutturaAttiva(data[0].id);
        }
        setCaricamentoStrutture(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessione]);

  const impostaStrutturaAttiva = useCallback((propertyId) => {
    setStrutturaAttivaId(propertyId);
    localStorage.setItem(CHIAVE_STRUTTURA_ATTIVA, propertyId);
  }, []);

  const strutturaAttiva = strutture.find((s) => s.id === strutturaAttivaId) ?? null;

  async function accediConMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { errore: error?.message ?? null };
  }

  async function esci() {
    await supabase.auth.signOut();
  }

  const valore = {
    supabase,
    sessione,
    host: sessione?.user ?? null, // oggetto Auth grezzo (solo id/email affidabili)
    profiloHost, // riga vera della tabella hosts (nome, cognome, telefono, ecc.)
    autenticato: !!sessione,
    caricamentoSessione: sessione === undefined,

    strutture,
    caricamentoStrutture,
    strutturaAttiva,
    strutturaAttivaId,
    impostaStrutturaAttiva,
    haPiuStrutture: strutture.length > 1,

    accediConMagicLink,
    esci,
  };

  return <OspitelyContext.Provider value={valore}>{children}</OspitelyContext.Provider>;
}

/**
 * Hook da usare in ogni componente che ha bisogno di sessione host,
 * client Supabase, o struttura attiva.
 *
 * Esempio d'uso nel form di onboarding, al posto del commento SUPABASE:
 *
 *   const { supabase, strutturaAttiva } = useOspitely();
 *   await supabase
 *     .from('property_profile')
 *     .upsert({ property_id: strutturaAttiva.id, ...payload });
 */
export function useOspitely() {
  const contesto = useContext(OspitelyContext);
  if (!contesto) {
    throw new Error('useOspitely deve essere usato dentro <OspitelyProvider>');
  }
  return contesto;
}

// ============================================================
// Esempio d'uso (radice dell'app)
// ============================================================
//
// import { OspitelyProvider } from './ospitely-app-context.jsx';
//
// function App() {
//   return (
//     <OspitelyProvider>
//       <Dashboard />
//     </OspitelyProvider>
//   );
// }
//
// // Selettore struttura in header (solo se haPiuStrutture):
// const { strutture, strutturaAttivaId, impostaStrutturaAttiva, haPiuStrutture } = useOspitely();
// {haPiuStrutture && (
//   <select value={strutturaAttivaId} onChange={(e) => impostaStrutturaAttiva(e.target.value)}>
//     {strutture.map((s) => <option key={s.id} value={s.id}>{s.nome_struttura}</option>)}
//   </select>
// )}
