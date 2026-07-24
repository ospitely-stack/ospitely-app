import React from 'react';

// ============================================================
// OSPITELY — Termini di Servizio (bozza)
//
// ATTENZIONE: bozza scritta in coerenza con le regole di prodotto già
// definite nel progetto (verifica camere, limite dispositivi, ecc.).
// Da far rivedere da un legale prima della pubblicazione, in
// particolare le clausole di limitazione di responsabilità e di
// recesso, che variano in base alla forma giuridica scelta.
// ============================================================

export default function PaginaTermini() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-stone-800">
      <a href="/" className="text-sm text-stone-400 hover:text-stone-600">← Torna alla home</a>
      <h1 className="text-2xl font-semibold mt-4 mb-2">Termini di Servizio</h1>
      <p className="text-sm text-stone-400 mb-8">Ultimo aggiornamento: [data da inserire al momento della pubblicazione]</p>

      <Sezione titolo="1. Il servizio">
        <p>
          Ospitely è un assistente conversazionale basato su intelligenza artificiale, pensato per
          rispondere alle domande degli ospiti di strutture ricettive e per instradare le loro
          segnalazioni verso l'host. Il servizio è offerto in abbonamento mensile all'host; l'ospite lo
          usa gratuitamente durante il soggiorno, senza creare un account.
        </p>
      </Sezione>

      <Sezione titolo="2. Chi è il nostro cliente">
        <p>
          Il cliente di Ospitely è l'host, che sottoscrive l'abbonamento. L'ospite non ha alcun rapporto
          contrattuale con Ospitely: usa la chat come cortesia messa a disposizione dall'host, e ogni
          responsabilità relativa al soggiorno (contratto di alloggio, condizioni di cancellazione,
          ecc.) resta esclusivamente tra host e ospite.
        </p>
      </Sezione>

      <Sezione titolo="3. Dichiarazione del numero di camere">
        <p>
          Il prezzo dell'abbonamento è determinato dal numero di camere dichiarato dall'host in fase di
          registrazione. Tale numero può essere oggetto di verifica. Una dichiarazione non veritiera
          rende l'abbonamento nullo, fatto salvo il diritto di Ospitely di richiedere il pagamento della
          differenza dovuta per il periodo in cui il numero reale di camere ha superato quello dichiarato.
        </p>
      </Sezione>

      <Sezione titolo="4. Codice di accesso e limiti d'uso">
        <p>L'accesso alla chat da parte dell'ospite è regolato dalle seguenti condizioni tecniche:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Ogni soggiorno ha un codice di accesso dedicato, valido dalla data di check-in alla data di check-out (più un giorno di margine), fino a un massimo di 7 notti per codice</li>
          <li>Ogni codice può essere usato da un massimo di 2 dispositivi</li>
          <li>Ogni soggiorno ha un tetto massimo di messaggi scambiabili con l'assistente, proporzionale alla durata del soggiorno</li>
        </ul>
        <p className="mt-2">
          Questi limiti sono applicati automaticamente dal sistema per garantire un uso corretto del
          servizio e non sono negoziabili caso per caso, salvo diverso accordo scritto con Ospitely.
        </p>
      </Sezione>

      <Sezione titolo="5. Contenuto delle risposte dell'assistente">
        <p>
          Le risposte dell'assistente sono generate automaticamente sulla base delle informazioni
          inserite dall'host nel profilo della struttura. Ospitely non garantisce l'accuratezza assoluta
          di ogni risposta e non è responsabile per decisioni prese dall'ospite sulla base di
          un'informazione errata o incompleta; resta responsabilità dell'host mantenere aggiornato il
          profilo della propria struttura. In caso l'assistente non disponga di un'informazione
          richiesta, indirizza esplicitamente l'ospite a contattare l'host direttamente.
        </p>
      </Sezione>

      <Sezione titolo="6. Abbonamento, fatturazione e recesso">
        <p>
          L'abbonamento è a rinnovo mensile automatico, addebitato tramite Stripe. L'host può modificare
          il piano, aggiornare il metodo di pagamento o cancellare l'abbonamento in qualsiasi momento dal
          pannello di gestione abbonamento. La cancellazione ha effetto alla fine del periodo di
          fatturazione già pagato; non sono previsti rimborsi per periodi parziali, salvo diversa
          indicazione di legge applicabile.
        </p>
      </Sezione>

      <Sezione titolo="7. Sospensione del servizio">
        <p>
          In caso di mancato pagamento, l'accesso alla chat per tutte le strutture dell'host viene
          sospeso automaticamente fino alla regolarizzazione del pagamento.
        </p>
      </Sezione>

      <Sezione titolo="8. Limitazione di responsabilità">
        <p>
          Il servizio è fornito "così com'è". Nei limiti massimi consentiti dalla legge applicabile,
          Ospitely non risponde di danni indiretti derivanti dall'uso o dall'impossibilità di uso del
          servizio, inclusi mancati guadagni o perdita di prenotazioni, salvo il caso di dolo o colpa
          grave.
        </p>
      </Sezione>

      <Sezione titolo="9. Modifiche ai termini">
        <p>
          Questi termini possono essere aggiornati; le modifiche sostanziali verranno comunicate agli
          host attivi via email con ragionevole anticipo prima dell'entrata in vigore.
        </p>
      </Sezione>

      <Sezione titolo="10. Legge applicabile">
        <p>
          I presenti termini sono regolati dalla legge italiana. Per ogni controversia è competente il
          foro di [città da definire in base alla sede legale].
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
