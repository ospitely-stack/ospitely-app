import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { FASCE_CAMERE } from './ospitely-fasce-prezzo.js';

// ============================================================
// OSPITELY — Form di registrazione host
// Raccoglie i dati dell'host e della prima struttura, poi reindirizza
// a Stripe Checkout. Host e struttura vengono creati solo DOPO il
// pagamento, dal webhook Stripe (non da questo form).
// ============================================================

// SUPABASE: valorizzare con l'URL reale delle Edge Function
const URL_FUNZIONI = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
const URL_CREA_CHECKOUT = `${URL_FUNZIONI}/crea-checkout-registrazione`;

const stileInput =
  'w-full rounded-lg border border-stone-300 px-3 py-2.5 text-[15px] text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500';
const stileLabel = 'block text-sm font-medium text-stone-700 mb-1.5';

export default function FormRegistrazioneHost() {
  const [form, setForm] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefonoWhatsapp: '',
    nomeStruttura: '',
    tipoStruttura: '',
    numeroCamere: '',
  });
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(null);

  function aggiorna(campo, valore) {
    setForm((f) => ({ ...f, [campo]: valore }));
  }

  function validazione() {
    if (!form.nome.trim() || !form.cognome.trim()) return 'Inserisci nome e cognome';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email non valida';
    if (!form.telefonoWhatsapp.trim()) return 'Inserisci un numero di telefono/WhatsApp';
    if (!form.nomeStruttura.trim()) return 'Inserisci il nome della struttura';
    if (!form.tipoStruttura) return 'Seleziona il tipo di struttura';
    if (!form.numeroCamere) return 'Seleziona il numero di camere';
    return null;
  }

  async function procedi() {
    const erroreValidazione = validazione();
    if (erroreValidazione) {
      setErrore(erroreValidazione);
      return;
    }

    setInvio(true);
    setErrore(null);

    try {
      const res = await fetch(URL_CREA_CHECKOUT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify(form),
      });
      const dati = await res.json();

      if (!res.ok) {
        setErrore(dati.errore ?? 'Errore, riprova');
        setInvio(false);
        return;
      }

      // Reindirizza a Stripe Checkout — da qui in poi il pagamento
      // è gestito interamente da Stripe
      window.location.href = dati.url;
    } catch {
      setErrore('Errore di connessione, riprova');
      setInvio(false);
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F7F5F1] px-4 py-8">
      <h1 className="font-display text-xl text-stone-900 mb-1">Crea il tuo account Ospitely</h1>
      <p className="text-sm text-stone-500 mb-6">
        Compila i dati per te e per la tua prima struttura — al termine verrai reindirizzato al pagamento sicuro tramite Stripe
      </p>

      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4 space-y-4">
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">I tuoi dati</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={stileLabel}>Nome</label>
            <input className={stileInput} value={form.nome} onChange={(e) => aggiorna('nome', e.target.value)} />
          </div>
          <div>
            <label className={stileLabel}>Cognome</label>
            <input className={stileInput} value={form.cognome} onChange={(e) => aggiorna('cognome', e.target.value)} />
          </div>
        </div>

        <div>
          <label className={stileLabel}>Email</label>
          <input type="email" className={stileInput} value={form.email} onChange={(e) => aggiorna('email', e.target.value)} />
        </div>

        <div>
          <label className={stileLabel}>Telefono / WhatsApp</label>
          <input className={stileInput} placeholder="+39 ..." value={form.telefonoWhatsapp}
            onChange={(e) => aggiorna('telefonoWhatsapp', e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4 space-y-4">
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">La tua prima struttura</h2>

        <div>
          <label className={stileLabel}>Nome struttura</label>
          <input className={stileInput} placeholder="Es. Hotel Bellavista" value={form.nomeStruttura}
            onChange={(e) => aggiorna('nomeStruttura', e.target.value)} />
        </div>

        <div>
          <label className={stileLabel}>Tipo struttura</label>
          <select className={stileInput + ' bg-white'} value={form.tipoStruttura}
            onChange={(e) => aggiorna('tipoStruttura', e.target.value)}>
            <option value="">Seleziona...</option>
            <option value="hotel">Hotel</option>
            <option value="b&b">B&B</option>
            <option value="affittacamere">Affittacamere</option>
            <option value="affitto_turistico">Affitto turistico</option>
            <option value="casa_vacanze">Casa vacanze</option>
          </select>
        </div>

        <div>
          <label className={stileLabel}>Quante camere?</label>
          <select className={stileInput + ' bg-white'} value={form.numeroCamere}
            onChange={(e) => aggiorna('numeroCamere', e.target.value)}>
            <option value="">Seleziona...</option>
            {FASCE_CAMERE.map((f) => (
              <option key={f.valore} value={f.valore}>{f.etichetta}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-500">
            Il numero dichiarato viene verificato: dichiarazioni non veritiere rendono l'abbonamento nullo
          </p>
        </div>
      </div>

      {errore && (
        <p className="text-sm text-red-600 flex items-start gap-1.5 mb-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {errore}
        </p>
      )}

      <button
        type="button"
        onClick={procedi}
        disabled={invio}
        className="w-full bg-[#0E3D3C] hover:bg-[#0A2E2D] disabled:bg-stone-300 text-white font-medium py-3.5 rounded-lg flex items-center justify-center gap-2"
      >
        {invio ? <Loader2 size={18} className="animate-spin" /> : 'Continua verso il pagamento'}
      </button>
    </div>
  );
}
