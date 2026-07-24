import React, { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useOspitely } from './ospitely-app-context.jsx';
import { FASCE_CAMERE } from './ospitely-fasce-prezzo.js';

// ============================================================
// OSPITELY — Modale "Aggiungi struttura"
// Per un host già esistente che vuole registrare una struttura in
// più, con lo sconto multi-struttura applicato in automatico.
// ============================================================

const stileInput =
  'w-full rounded-lg border border-stone-300 px-3 py-2.5 text-[15px] text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500';
const stileLabel = 'block text-sm font-medium text-stone-700 mb-1.5';

export default function ModaleAggiungiStruttura({ onChiudi }) {
  const { sessione } = useOspitely();
  const [form, setForm] = useState({ nomeStruttura: '', tipoStruttura: '', numeroCamere: '' });
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(null);

  function aggiorna(campo, valore) {
    setForm((f) => ({ ...f, [campo]: valore }));
  }

  async function procedi() {
    if (!form.nomeStruttura.trim() || !form.tipoStruttura || !form.numeroCamere) {
      setErrore('Compila tutti i campi');
      return;
    }

    setInvio(true);
    setErrore(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/crea-checkout-nuova-struttura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${sessione.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const dati = await res.json();

      if (!res.ok) {
        setErrore(dati.errore ?? 'Errore, riprova');
        setInvio(false);
        return;
      }

      window.location.href = dati.url;
    } catch {
      setErrore('Errore di connessione, riprova');
      setInvio(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-30">
      <div className="w-full max-w-md bg-white rounded-t-2xl px-5 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-900">Aggiungi struttura</h2>
          <button type="button" onClick={onChiudi}><X size={20} className="text-stone-400" /></button>
        </div>

        <p className="text-sm text-stone-500 mb-4">
          Lo sconto del 15% per il piano multi-struttura si applica in automatico al checkout.
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className={stileLabel}>Nome struttura</label>
            <input className={stileInput} placeholder="Es. Villa Rosa" value={form.nomeStruttura}
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
          className="w-full bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
        >
          {invio ? <Loader2 size={18} className="animate-spin" /> : 'Continua verso il pagamento'}
        </button>
      </div>
    </div>
  );
}
