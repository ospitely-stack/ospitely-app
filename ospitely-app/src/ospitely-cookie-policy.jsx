import React from 'react';

// ============================================================
// OSPITELY — Cookie Policy (bozza)
//
// Riflette onestamente cosa usa davvero il codice: quasi tutto
// localStorage (device_id, soggiorno_id, struttura attiva, sessione
// Supabase Auth), non cookie di tracciamento tradizionali. Nessun
// pixel pubblicitario o cookie di terze parti nel prodotto stesso —
// Stripe ne usa sulle proprie pagine di checkout/portale, fuori dal
// dominio Ospitely.
// ============================================================

export default function PaginaCookie() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-stone-800">
      <a href="/" className="text-sm text-stone-400 hover:text-stone-600">← Torna alla home</a>
      <h1 className="text-2xl font-semibold mt-4 mb-2">Cookie Policy</h1>
      <p className="text-sm text-stone-400 mb-8">Ultimo aggiornamento: [data da inserire al momento della pubblicazione]</p>

      <Sezione titolo="Una precisazione onesta">
        <p>
          Ospitely non usa cookie di profilazione o di tracciamento pubblicitario. La maggior parte dei
          dati tecnici che il sito conserva sul tuo dispositivo non sono cookie in senso stretto, ma
          voci di <strong>local storage</strong> del browser — tecnicamente diverse dai cookie, ma
          descritte comunque qui per completezza e trasparenza.
        </p>
      </Sezione>

      <Sezione titolo="Cosa conserviamo sul dispositivo dell'ospite">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Un identificativo del dispositivo</strong> (generato localmente, senza dati
            identificativi) — usato solo per rispettare il limite di dispositivi per soggiorno
          </li>
          <li>
            <strong>Il riferimento al soggiorno verificato</strong> — evita di dover reinserire il
            codice di accesso a ogni apertura della chat durante lo stesso soggiorno
          </li>
        </ul>
        <p className="mt-2">
          Nessuno di questi dati viene condiviso con terze parti o usato per fini pubblicitari.
        </p>
      </Sezione>

      <Sezione titolo="Cosa conserviamo sul dispositivo dell'host">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>La sessione di accesso</strong> (gestita da Supabase Auth), necessaria per restare
            autenticati nella dashboard senza rifare il login a ogni pagina
          </li>
          <li>
            <strong>La struttura selezionata</strong>, se l'host ne gestisce più di una — solo per
            comodità, ritrova la stessa struttura aperta l'ultima volta
          </li>
        </ul>
      </Sezione>

      <Sezione titolo="Cookie di terze parti">
        <p>
          Quando l'host viene reindirizzato a Stripe per completare un pagamento o gestire
          l'abbonamento, lascia temporaneamente il dominio Ospitely per una pagina di Stripe, che può
          impostare propri cookie secondo la propria informativa. Ospitely non ha controllo su questi
          cookie: puoi consultare la cookie policy di Stripe sul loro sito.
        </p>
      </Sezione>

      <Sezione titolo="Come cancellare questi dati">
        <p>
          Puoi cancellare in ogni momento i dati salvati dal browser tramite le impostazioni del tuo
          dispositivo (di norma: impostazioni del browser → privacy → cancella dati di navigazione per
          questo sito). Nota per gli ospiti: cancellando questi dati durante un soggiorno attivo, dovrai
          reinserire il codice di accesso alla successiva apertura della chat.
        </p>
      </Sezione>
    </div>
  );
}

function Sezione({ titolo, children }) {
  return (
    <section className="mb-6">
      <h2 className="font-semibold text-stone-900 mb-2">{titolo}</h2>
      <div className="text-sm text-stone-600 leading-relaxed">{children}</div>
    </section>
  );
}
