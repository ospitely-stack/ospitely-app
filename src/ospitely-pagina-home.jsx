import React from 'react';
import { Globe2, MessageCircleWarning, QrCode, Clock, ShieldCheck, Sparkles } from 'lucide-react';

// ============================================================
// OSPITELY — Landing page pubblica (route "/")
// Contenuto di marketing reale, non più un placeholder.
// ============================================================

export default function PaginaHome() {
  return (
    <div className="bg-white text-stone-900">
      <Header />
      <Hero />
      <Problema />
      <ComeFunziona />
      <Funzionalita />
      <Prezzi />
      <CtaFinale />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
      <span className="font-semibold text-lg">Ospitely</span>
      <div className="flex items-center gap-4">
        <a href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">
          Accedi
        </a>
        <a href="/register" className="text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-lg">
          Inizia ora
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="max-w-3xl mx-auto px-6 pt-12 pb-16 text-center">
      <span className="inline-block text-xs font-medium bg-stone-100 text-stone-600 px-3 py-1 rounded-full mb-5">
        Per B&B, hotel e affitti turistici
      </span>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
        Il tuo assistente per gli ospiti, che parla tutte le lingue e non dorme mai
      </h1>
      <p className="text-lg text-stone-500 mb-8">
        Un QR code in camera, zero app da scaricare. I tuoi ospiti chattano nella loro lingua
        e ricevi solo le segnalazioni che contano davvero — direttamente su WhatsApp.
      </p>
      <div className="flex items-center justify-center gap-3">
        <a href="/register" className="bg-stone-900 text-white font-medium px-6 py-3 rounded-lg">
          Crea il tuo account
        </a>
        <a href="#come-funziona" className="text-stone-600 font-medium px-6 py-3">
          Come funziona →
        </a>
      </div>
    </section>
  );
}

function Problema() {
  const punti = [
    { Icona: Clock, testo: 'Le stesse domande su WiFi, colazione e check-out, ogni singolo giorno' },
    { Icona: Globe2, testo: 'Ospiti stranieri che non capisci, o che non ti capiscono' },
    { Icona: MessageCircleWarning, testo: 'Un problema urgente segnalato troppo tardi, perché nessuno l\'ha letto in tempo' },
  ];

  return (
    <section className="bg-stone-50 py-16">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-2xl font-semibold text-center mb-10">Ti suona familiare?</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {punti.map(({ Icona, testo }, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-200 p-5">
              <Icona size={22} className="text-stone-400 mb-3" />
              <p className="text-stone-700 text-sm leading-relaxed">{testo}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComeFunziona() {
  const passi = [
    { numero: '1', titolo: 'Compili il profilo una volta', testo: 'Orari, WiFi, regole della casa, consigli locali — tutto in italiano, una volta sola.' },
    { numero: '2', titolo: 'Stampi il QR code', testo: 'Lo metti in camera. L\'ospite scansiona, inserisce il codice del suo soggiorno, e chatta.' },
    { numero: '3', titolo: 'Ricevi solo ciò che conta', testo: 'Le domande le risponde l\'assistente, nella lingua dell\'ospite. I problemi veri arrivano a te su WhatsApp.' },
  ];

  return (
    <section id="come-funziona" className="py-16 max-w-4xl mx-auto px-6">
      <h2 className="text-2xl font-semibold text-center mb-10">Come funziona</h2>
      <div className="grid sm:grid-cols-3 gap-8">
        {passi.map((p) => (
          <div key={p.numero}>
            <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-medium mb-3">
              {p.numero}
            </div>
            <h3 className="font-medium mb-1.5">{p.titolo}</h3>
            <p className="text-sm text-stone-500 leading-relaxed">{p.testo}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Funzionalita() {
  const voci = [
    { Icona: Globe2, titolo: 'Multilingua reale', testo: 'L\'ospite scrive nella sua lingua, l\'assistente capisce e risponde di conseguenza. Nessuna traduzione da gestire tu.' },
    { Icona: QrCode, titolo: 'Zero app da installare', testo: 'Un link, un QR code. Funziona nel browser del telefono, come una pagina web qualsiasi.' },
    { Icona: MessageCircleWarning, titolo: 'Segnalazioni dirette', testo: 'Urgenze e richieste arrivano dove già controlli: WhatsApp, SMS o una chiamata diretta.' },
    { Icona: ShieldCheck, titolo: 'Accesso solo ai tuoi ospiti', testo: 'Un codice legato alle date reali del soggiorno — non a chiunque trovi il link.' },
    { Icona: Sparkles, titolo: 'Sempre coerente', testo: 'Le stesse informazioni, dette con lo stesso tono, ogni volta — anche quando tu non ci sei.' },
    { Icona: Clock, titolo: 'Disponibile 24/7', testo: 'Le domande fuori orario non aspettano più la mattina dopo.' },
  ];

  return (
    <section className="bg-stone-50 py-16">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-2xl font-semibold text-center mb-10">Cosa include</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {voci.map(({ Icona, titolo, testo }) => (
            <div key={titolo} className="flex gap-4">
              <Icona size={20} className="text-stone-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">{titolo}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{testo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Prezzi() {
  const fasce = [
    { camere: '1-2 camere', prezzo: '€9,90' },
    { camere: '3-4 camere', prezzo: '€14,90' },
    { camere: '5-7 camere', prezzo: '€24,90' },
    { camere: '8-10 camere', prezzo: '€34,90' },
  ];

  return (
    <section className="py-16 max-w-4xl mx-auto px-6">
      <h2 className="text-2xl font-semibold text-center mb-2">Un prezzo pensato per la tua struttura</h2>
      <p className="text-center text-stone-500 mb-10">Paghi in base al numero di camere, non un piano unico per tutti</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {fasce.map((f) => (
          <div key={f.camere} className="border border-stone-200 rounded-xl p-4 text-center">
            <p className="text-xs text-stone-400 mb-1">{f.camere}</p>
            <p className="text-xl font-semibold">{f.prezzo}<span className="text-sm font-normal text-stone-400">/mese</span></p>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-stone-400 mt-6">
        Fino a 100 camere, e sconto del 15% se gestisci più strutture
      </p>
    </section>
  );
}

function CtaFinale() {
  return (
    <section className="bg-stone-900 text-white py-16 text-center">
      <h2 className="text-2xl font-semibold mb-3">Pronto a smettere di rispondere sempre alle stesse domande?</h2>
      <a href="/register" className="inline-block bg-white text-stone-900 font-medium px-6 py-3 rounded-lg mt-4">
        Crea il tuo account
      </a>
    </section>
  );
}

function Footer() {
  return (
    <footer className="max-w-4xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-400">
      <span>© {new Date().getFullYear()} Ospitely</span>
      <div className="flex gap-4">
        <a href="/privacy" className="hover:text-stone-600">Privacy</a>
        <a href="/terms" className="hover:text-stone-600">Termini di servizio</a>
        <a href="/cookie" className="hover:text-stone-600">Cookie</a>
      </div>
    </footer>
  );
}
