import React, { useState, useEffect } from 'react';
import { OspitelyProvider, useOspitely } from './ospitely-app-context.jsx';
import FormRegistrazioneHost from './ospitely-registrazione-host.jsx';
import Dashboard from './ospitely-dashboard.jsx';
import ChatOspite from './ospitely-chat-ospite.jsx';
import PaginaHome from './ospitely-pagina-home.jsx';
import PaginaPrivacy from './ospitely-privacy-policy.jsx';
import PaginaTermini from './ospitely-termini-servizio.jsx';
import PaginaCookie from './ospitely-cookie-policy.jsx';

// ============================================================
// OSPITELY — Router principale
// Legge window.location.pathname (già "raddrizzato" dal trucco
// 404.html + snippet index.html, vedi quei due file) e decide cosa
// mostrare: una pagina fissa dell'app, oppure la chat di una struttura
// identificata dal suo slug.
//
// IMPORTANTE: le rotte fisse qui sotto devono coincidere esattamente
// con la lista SLUG_RISERVATI del trigger SQL (properties.slug) e di
// ospitely-slug.js — se aggiungi una rotta nuova, aggiungila anche lì,
// altrimenti un host potrebbe registrare una struttura con quel nome
// e collidere con una pagina vera dell'app.
// ============================================================

export default function App() {
  const percorso = usaPercorsoCorrente();
  const segmento = percorso.split('/').filter(Boolean)[0] ?? '';

  // Rotte fisse dell'app (devono combaciare con SLUG_RISERVATI)
  switch (segmento) {
    case '':
      return <PaginaHome />;
    case 'privacy':
      return <PaginaPrivacy />;
    case 'terms':
      return <PaginaTermini />;
    case 'cookie':
      return <PaginaCookie />;
    case 'register':
      return <FormRegistrazioneHost />;
    case 'dashboard':
      return (
        <OspitelyProvider>
          <AreaHostProtetta />
        </OspitelyProvider>
      );
    case 'login':
      return (
        <OspitelyProvider>
          <PaginaLogin />
        </OspitelyProvider>
      );
    // admin, api, app, chat, pricing, about, signup, logout, settings,
    // account, help, support: da collegare alle rispettive pagine quando
    // esisteranno — per ora ricadono nel default (404)
    default:
      // Non è una rotta fissa nota: probabilmente è lo slug di una struttura
      return <ChatOspite slug={segmento} />;
  }
}

/**
 * Tiene traccia del pathname corrente e si aggiorna sia sulla
 * navigazione avanti/indietro del browser (popstate) sia quando lo
 * snippet index.html corregge l'URL dopo il redirect di 404.html.
 */
function usaPercorsoCorrente() {
  const [percorso, setPercorso] = useState(window.location.pathname);

  useEffect(() => {
    const aggiorna = () => setPercorso(window.location.pathname);
    window.addEventListener('popstate', aggiorna);
    return () => window.removeEventListener('popstate', aggiorna);
  }, []);

  return percorso;
}

// ============================================================
// Login host (magic link) — mostrata se non c'è sessione, altrimenti
// reindirizza subito alla dashboard
// ============================================================
function PaginaLogin() {
  const { autenticato, caricamentoSessione, accediConMagicLink } = useOspitely();
  const [email, setEmail] = useState('');
  const [inviato, setInviato] = useState(false);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    if (autenticato) window.location.href = '/dashboard';
  }, [autenticato]);

  if (caricamentoSessione) return null;

  async function invia() {
    const { errore: err } = await accediConMagicLink(email);
    if (err) { setErrore(err); return; }
    setInviato(true);
  }

  if (inviato) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center bg-stone-50">
        <p className="text-stone-700">Controlla la tua email — ti abbiamo inviato un link di accesso.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-stone-50">
      <h1 className="text-xl font-semibold text-stone-900 mb-4">Accedi a Ospitely</h1>
      <input
        type="email"
        className="w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2.5 mb-3"
        placeholder="La tua email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {errore && <p className="text-sm text-red-600 mb-3">{errore}</p>}
      <button onClick={invia} className="w-full max-w-xs bg-stone-800 text-white font-medium py-2.5 rounded-lg">
        Inviami il link di accesso
      </button>
    </div>
  );
}

// ============================================================
// Guardia di autenticazione per /dashboard
// ============================================================
function AreaHostProtetta() {
  const { autenticato, caricamentoSessione } = useOspitely();

  useEffect(() => {
    if (!caricamentoSessione && !autenticato) window.location.href = '/login';
  }, [caricamentoSessione, autenticato]);

  if (caricamentoSessione || !autenticato) return null;

  return <Dashboard />;
}
