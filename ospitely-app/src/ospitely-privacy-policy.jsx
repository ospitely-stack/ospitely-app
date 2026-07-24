import React from 'react';

// ============================================================
// OSPITELY — Privacy Policy (bozza)
//
// ATTENZIONE: questo è un testo di base scritto per riflettere
// accuratamente come Ospitely tratta i dati (in base a tutto quello
// che abbiamo costruito nel progetto), ma NON sostituisce una
// revisione da parte di un legale prima della pubblicazione — in
// particolare per la sezione titolare del trattamento, i tempi di
// conservazione esatti, e l'eventuale nomina di un DPO.
// ============================================================

export default function PaginaPrivacy() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-stone-800">
      <a href="/" className="text-sm text-stone-400 hover:text-stone-600">← Torna alla home</a>
      <h1 className="text-2xl font-semibold mt-4 mb-2">Informativa sulla Privacy</h1>
      <p className="text-sm text-stone-400 mb-8">Ultimo aggiornamento: [data da inserire al momento della pubblicazione]</p>

      <Sezione titolo="1. Titolare del trattamento">
        <p>
          Il titolare del trattamento dei dati è [Nome e cognome / ragione sociale], con sede in
          [indirizzo], P.IVA [numero], contattabile all'indirizzo email [email di contatto].
        </p>
      </Sezione>

      <Sezione titolo="2. Due categorie di persone, due trattamenti diversi">
        <p>
          Ospitely tratta dati di due tipi di persone in modo distinto: gli <strong>host</strong>, che si
          registrano, pagano un abbonamento e configurano le proprie strutture, e gli <strong>ospiti</strong>,
          che usano la chat durante il soggiorno senza mai creare un account.
        </p>
      </Sezione>

      <Sezione titolo="3. Dati raccolti dall'host">
        <ul className="list-disc pl-5 space-y-1">
          <li>Nome, cognome, email, numero di telefono/WhatsApp (in fase di registrazione)</li>
          <li>Dati di pagamento — gestiti interamente da Stripe, Ospitely non li vede né li conserva mai direttamente</li>
          <li>Dati della struttura inseriti nel profilo (indirizzo, WiFi, regole della casa, contatti, ecc.)</li>
        </ul>
        <p className="mt-2">
          <strong>Base giuridica</strong>: esecuzione del contratto di abbonamento (art. 6.1.b GDPR).
        </p>
      </Sezione>

      <Sezione titolo="4. Dati raccolti dall'ospite">
        <p>L'ospite non crea mai un account. I dati trattati durante l'uso della chat sono:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Il contenuto dei messaggi scambiati con l'assistente, per generare le risposte e mantenere il contesto della conversazione</li>
          <li>Un identificativo anonimo del dispositivo (generato localmente, non collegato all'identità reale), usato solo per applicare il limite di dispositivi per soggiorno</li>
          <li>L'indirizzo IP, trasformato in un valore illeggibile (hash) e usato solo per prevenire tentativi ripetuti di indovinare un codice di accesso — non viene mai conservato in chiaro né usato per identificare la persona</li>
          <li>Se l'ospite sceglie di segnalare un problema: il testo della segnalazione e il canale scelto (WhatsApp/SMS/chiamata)</li>
        </ul>
        <p className="mt-2">
          <strong>Base giuridica</strong>: legittimo interesse dell'host a fornire assistenza durante il soggiorno,
          ed esecuzione delle misure precontrattuali/contrattuali legate alla prenotazione (art. 6.1.b e 6.1.f GDPR).
        </p>
      </Sezione>

      <Sezione titolo="5. Fornitori che trattano dati per conto nostro (responsabili del trattamento)">
        <p>Per fornire il servizio, ci appoggiamo ai seguenti fornitori, ciascuno con il proprio ruolo:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Supabase</strong> — hosting del database e autenticazione host</li>
          <li><strong>Anthropic (Claude API)</strong> — elabora il contenuto dei messaggi in chat per generare le risposte dell'assistente</li>
          <li><strong>Resend</strong> — invio delle email di autenticazione e comunicazioni relative all'account host</li>
          <li><strong>Stripe</strong> — gestione dei pagamenti e della fatturazione dell'abbonamento host</li>
        </ul>
        <p className="mt-2">
          Con ciascuno di questi fornitori è in essere (o va formalizzato prima del lancio) un accordo di
          trattamento dati (DPA) conforme all'art. 28 GDPR.
        </p>
      </Sezione>

      <Sezione titolo="6. Tempi di conservazione">
        <p>
          I dati dell'host restano associati all'account finché questo resta attivo, più il periodo
          richiesto dagli obblighi fiscali/contabili. Le conversazioni e le segnalazioni degli ospiti
          restano visibili all'host nello storico della propria struttura; [va definita una politica di
          cancellazione automatica dopo un periodo — es. 24 mesi dal soggiorno — prima della pubblicazione].
        </p>
      </Sezione>

      <Sezione titolo="7. I tuoi diritti">
        <p>
          In quanto interessato puoi esercitare in ogni momento i diritti previsti dagli artt. 15-22 GDPR:
          accesso, rettifica, cancellazione, limitazione, portabilità, opposizione al trattamento. Puoi
          farlo scrivendo a [email di contatto privacy]. Hai inoltre diritto di proporre reclamo al Garante
          per la Protezione dei Dati Personali.
        </p>
      </Sezione>

      <Sezione titolo="8. Ospiti minorenni">
        <p>
          Il servizio non è pensato per essere usato autonomamente da minori. I dati di eventuali minori
          che soggiornano nella struttura sono trattati sotto la responsabilità dell'adulto che gestisce il
          soggiorno.
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
