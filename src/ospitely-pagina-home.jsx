import React, { useState, useEffect, useRef } from 'react';
import { Globe2, MessageCircleWarning, QrCode, Clock, ShieldCheck, Sparkles, Check, Languages } from 'lucide-react';

// ============================================================
// OSPITELY — Landing page pubblica (route "/")
// Contenuto di marketing reale, con demo dal vivo della chat
// multilingua nell'hero come elemento centrale di conversione.
// ============================================================

export default function PaginaHome() {
  return (
    <div className="bg-[#FBF7F1] text-stone-900">
      <Header />
      <Hero />
      <StatBar />
      <RiepilogoTraduzione />
      <Problema />
      <ComeFunziona />
      <Funzionalita />
      <Citazione />
      <Prezzi />
      <CtaFinale />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
      <span className="font-display text-lg">Ospitely</span>
      <div className="flex items-center gap-4">
        <a href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">
          Accedi
        </a>
        <a href="/register" className="text-sm font-medium bg-[#0E3D3C] text-white px-4 py-2 rounded-lg">
          Inizia ora
        </a>
      </div>
    </header>
  );
}

// ============================================================
// HERO — con demo dal vivo della chat multilingua: l'elemento
// che mostra il prodotto invece di limitarsi a descriverlo.
// ============================================================
function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-8 pb-16 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <span className="inline-flex items-center gap-2 text-xs font-bold bg-[#FCEEDF] text-[#B4472B] px-3.5 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D9653D]" />
          Per Hotel, B&B, case vacanze e affitti turistici
        </span>
        <h1 className="font-display text-4xl sm:text-[52px] leading-[1.06] tracking-tight text-[#0E3D3C] mb-5">
          I tuoi ospiti chattano.<br />Tu <span className="text-[#D9653D]">rispondi</span> solo<br />quando conta davvero.
        </h1>
        <p className="text-lg text-stone-500 mb-8 max-w-md">
          Un QR code in camera, zero app da scaricare. Ospitely risponde ai tuoi ospiti in qualsiasi lingua,
          24 ore su 24 — e ti scrive solo per quello che deve arrivare davvero a te.
        </p>
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <a href="/register" className="bg-[#D9653D] hover:bg-[#C2552F] text-white font-bold px-7 py-4 rounded-2xl shadow-lg shadow-[#D9653D]/25 transition-colors">
            Crea il tuo account →
          </a>
          <a href="#come-funziona" className="font-semibold text-[#0E3D3C]">
            Guarda come funziona
          </a>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {['Attivo in 5 minuti', 'Nessun contratto vincolante', 'Pagamenti sicuri con Stripe'].map((testo) => (
            <span key={testo} className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-500">
              <Check size={15} className="text-[#1D5C56]" /> {testo}
            </span>
          ))}
        </div>
      </div>

      <DemoTelefono />
    </section>
  );
}

const CONVERSAZIONI_DEMO = [
  {
    lingua: '🇮🇹 IT',
    struttura: 'Villa Bellavista',
    msgs: [
      { chi: 'ospite', testo: 'A che ora è la colazione?' },
      { chi: 'bot', testo: 'Dalle 8:00 alle 10:30, in sala interna 🥐' },
      { chi: 'ospite', testo: 'Perfetto, grazie!' },
    ],
  },
  {
    lingua: '🇬🇧 EN',
    struttura: 'Villa Bellavista',
    msgs: [
      { chi: 'ospite', testo: 'What time is checkout?' },
      { chi: 'bot', testo: 'Check-out is by 10:30 AM — late checkout available on request.' },
      { chi: 'ospite', testo: 'Great, thank you!' },
    ],
  },
  {
    lingua: '🇫🇷 FR',
    struttura: 'Villa Bellavista',
    msgs: [
      { chi: 'ospite', testo: 'Quel est le mot de passe du WiFi ?' },
      { chi: 'bot', testo: 'Réseau : Bellavista_Guest — mot de passe : Soleil2026' },
      { chi: 'ospite', testo: 'Merci beaucoup !' },
    ],
  },
];

function DemoTelefono() {
  const [indiceConvo, setIndiceConvo] = useState(0);
  const [messaggiVisibili, setMessaggiVisibili] = useState(0);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setMessaggiVisibili(0);

    const convo = CONVERSAZIONI_DEMO[indiceConvo];
    convo.msgs.forEach((_, i) => {
      const id = setTimeout(() => setMessaggiVisibili(i + 1), i * 900);
      timeoutsRef.current.push(id);
    });

    const prossima = setTimeout(() => {
      setIndiceConvo((v) => (v + 1) % CONVERSAZIONI_DEMO.length);
    }, 4600);
    timeoutsRef.current.push(prossima);

    return () => timeoutsRef.current.forEach(clearTimeout);
  }, [indiceConvo]);

  const convo = CONVERSAZIONI_DEMO[indiceConvo];

  return (
    <div className="relative flex justify-center">
      <div className="absolute w-96 h-96 rounded-full bg-[#E8A24A]/25 blur-2xl -top-8 -right-6" />
      <div className="relative w-[280px] bg-white rounded-[34px] shadow-2xl shadow-[#0E3D3C]/25 ring-[10px] ring-[#0E3D3C]/5 overflow-hidden">
        <div className="relative bg-gradient-to-br from-[#0E3D3C] to-[#1D5C56] px-5 pt-5 pb-4 overflow-hidden">
          <div className="absolute -right-8 -top-10 w-28 h-28 rounded-full bg-white/5" />
          <span className="absolute top-3.5 right-4 bg-white/15 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
            {convo.lingua}
          </span>
          <p className="relative text-[10px] font-semibold tracking-[0.14em] text-teal-100/80 uppercase">Il tuo assistente</p>
          <h3 className="relative font-display text-lg text-white mt-0.5">{convo.struttura}</h3>
        </div>
        <div className="h-[280px] px-4 py-4 flex flex-col gap-2.5 overflow-hidden">
          {convo.msgs.slice(0, messaggiVisibili).map((m, i) => (
            <div key={i} className={`flex ${m.chi === 'ospite' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug ${
                  m.chi === 'ospite' ? 'bg-[#0E3D3C] text-white rounded-br-md' : 'bg-[#F7F5F1] text-stone-700 rounded-bl-md shadow-sm'
                }`}
              >
                {m.testo}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBar() {
  const stats = [
    { numero: '24/7', label: 'Sempre disponibile' },
    { numero: '∞', label: "Lingue capite dall'assistente" },
    { numero: '< 5 min', label: 'Per iniziare' },
    { numero: '€9,90', label: 'Al mese, da' },
  ];
  return (
    <div className="bg-[#0E3D3C] py-9">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-y-6 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-display text-3xl text-white">{s.numero}</p>
            <p className="text-xs font-semibold text-teal-100/75 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiepilogoTraduzione() {
  return (
    <div className="max-w-5xl mx-auto px-6 pt-10">
      <div className="flex flex-wrap items-center gap-6 bg-white border border-stone-200 rounded-2xl p-7">
        <div className="w-13 h-13 rounded-2xl bg-[#E1F0EE] flex items-center justify-center text-[#0E3D3C] shrink-0 p-3">
          <Languages size={26} />
        </div>
        <div className="flex-1 min-w-[260px]">
          <h3 className="font-semibold text-stone-900 mb-1">Ogni segnalazione, già nella tua lingua</h3>
          <p className="text-sm text-stone-500 leading-relaxed">
            Un ospite giapponese scrive un problema in giapponese: tu la ricevi su WhatsApp <strong className="text-stone-700">già tradotta in italiano</strong>,
            pronta da leggere. Rispondi come preferisci — anche in inglese, se ti viene più naturale: potresti scoprire che è proprio
            la lingua che l'ospite capisce meglio.
          </p>
        </div>
      </div>
    </div>
  );
}

function Problema() {
  const punti = [
    { Icona: Clock, testo: 'Le stesse domande su WiFi, colazione e check-out, ogni singolo giorno' },
    { Icona: Globe2, testo: 'Ospiti stranieri che non capisci, o che non ti capiscono' },
    { Icona: MessageCircleWarning, testo: 'Un problema urgente segnalato troppo tardi, perché nessuno l\'ha letto in tempo' },
  ];

  return (
    <section className="bg-[#F5F1E9] py-16 mt-10">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-display text-2xl text-center mb-10">Ti suona familiare?</h2>
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
      <h2 className="font-display text-2xl text-center mb-10">Come funziona</h2>
      <div className="grid sm:grid-cols-3 gap-8">
        {passi.map((p) => (
          <div key={p.numero}>
            <div className="w-8 h-8 rounded-full bg-[#0E3D3C] text-white flex items-center justify-center text-sm font-medium mb-3">
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
    { Icona: MessageCircleWarning, titolo: 'Segnalazioni dirette, già tradotte', testo: 'Urgenze e richieste arrivano dove già controlli — WhatsApp, SMS o chiamata — tradotte in italiano, qualunque lingua scriva l\'ospite.' },
    { Icona: ShieldCheck, titolo: 'Accesso solo ai tuoi ospiti', testo: 'Un codice legato alle date reali del soggiorno — non a chiunque trovi il link.' },
    { Icona: Sparkles, titolo: 'Sempre coerente', testo: 'Le stesse informazioni, dette con lo stesso tono, ogni volta — anche quando tu non ci sei.' },
    { Icona: Clock, titolo: 'Disponibile 24/7', testo: 'Le domande fuori orario non aspettano più la mattina dopo.' },
  ];

  return (
    <section className="bg-[#F5F1E9] py-16">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-display text-2xl text-center mb-10">Cosa include</h2>
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

function Citazione() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-16">
      <div className="relative bg-[#0E3D3C] rounded-3xl px-8 sm:px-14 py-12 overflow-hidden">
        <div className="absolute w-64 h-64 rounded-full bg-[#E8A24A]/15 -top-20 -left-16" />
        <p className="font-display text-6xl text-[#E8A24A] leading-none relative">"</p>
        <p className="font-display text-xl sm:text-[26px] text-white leading-snug max-w-xl relative mt-1">
          Immagina di non dover più rispondere due volte al giorno alla stessa domanda sull'orario della colazione —
          in tre lingue diverse.
        </p>
        <p className="text-sm font-semibold text-teal-100/80 mt-5 relative">— Quello che ogni host desidera, dal primo giorno</p>
      </div>
    </section>
  );
}

function Prezzi() {
  const fasce = [
    { camere: '1-2 camere', prezzo: '€9,90' },
    { camere: '3-4 camere', prezzo: '€14,90', evidenziato: true },
    { camere: '5-7 camere', prezzo: '€24,90' },
    { camere: '8-10 camere', prezzo: '€34,90' },
  ];

  return (
    <section className="py-16 max-w-4xl mx-auto px-6">
      <h2 className="font-display text-2xl text-center mb-2">Un prezzo pensato per la tua struttura</h2>
      <p className="text-center text-stone-500 mb-10">Paghi in base al numero di camere, non un piano unico per tutti</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {fasce.map((f) => (
          <div key={f.camere} className={`relative border rounded-xl p-4 text-center ${f.evidenziato ? 'border-2 border-[#D9653D]' : 'border-stone-200'}`}>
            {f.evidenziato && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D9653D] text-white text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                Più scelto
              </span>
            )}
            <p className="text-xs text-stone-400 mb-1">{f.camere}</p>
            <p className="text-xl font-semibold text-[#0E3D3C]">{f.prezzo}<span className="text-sm font-normal text-stone-400">/mese</span></p>
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
    <section className="bg-[#0E3D3C] text-white py-16 text-center">
      <h2 className="font-display text-2xl sm:text-3xl mb-3">Pronto a smettere di rispondere sempre alle stesse domande?</h2>
      <a href="/register" className="inline-block bg-white text-[#0E3D3C] font-bold px-6 py-3.5 rounded-xl mt-4">
        Crea il tuo account
      </a>
      <p className="text-sm text-teal-100/70 mt-4">Attivo in meno di 5 minuti. Nessun contratto vincolante.</p>
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
