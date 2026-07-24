# Ospitely — Specifica di Prodotto

Assistente AI multilingue per ospiti di strutture ricettive (B&B, hotel, affitti turistici).

**Dominio principale**: ospitely.com
**Dominio secondario/riserva**: ospitely.app

---

## 1. Concetto di prodotto

L'ospite scansiona un QR code in camera, accede a una chat, e può:
- Fare domande informative (orari, consigli locali, mezzi, WiFi, ecc.) in qualsiasi lingua
- Segnalare problemi urgenti o non urgenti direttamente all'host

**Valore per l'host**: risparmio di tempo (no risposte ripetitive), zero app da installare per l'ospite, gestione multilingue automatica.

---

## 2. Architettura tecnica (stack)

| Componente | Soluzione | Note |
|---|---|---|
| Frontend | GitHub Pages | statico, zero costi hosting |
| Backend/DB | Supabase | piano free fino a soglie generose |
| AI | Claude API (Haiku) | modello scelto per contenere i costi |
| Pagamenti | Stripe | Payment Links + Checkout + Webhooks |
| Email Auth | Supabase Auth + Resend | Resend come SMTP custom |
| Notifiche segnalazioni | Link nativi WhatsApp/SMS/tel | `wa.me/...`, `sms:...`, `tel:...` — zero costi |

### Schema Supabase (tabelle principali)

- **`hosts`** → id, nome, email, telefono/WhatsApp, max_properties, stripe_customer_id
- **`properties`** → id, host_id, nome struttura, **slug** (univoco globale, usato nel link pubblico), tipo struttura, piano/citofono *(relazione 1-a-molti: un host può gestire più strutture)*
- **`property_profile`** → tutti i dati configurati dall'host (vedi sezione 7) — è il "cervello" passato come contesto all'AI
- **`soggiorni`** → id, property_id, codice (6 caratteri), data_checkin, data_checkout, revocato — accesso alla chat legato a un soggiorno reale
- **`soggiorno_dispositivi`** → soggiorno_id, device_id, primo_accesso — limite 2 dispositivi per codice
- **`tentativi_codice_falliti`** → property_id, ip_hash, timestamp — protezione brute-force sul codice
- **`conversations`** → id, property_id, lingua rilevata, timestamp, contatore messaggi
- **`messages`** → conversation_id, ruolo (ospite/assistente), testo, timestamp
- **`alerts`** → id, property_id, tipo (urgente/non_urgente), canale_scelto (whatsapp/sms/chiamata), testo, timestamp

---

## 3. Slug struttura e QR code

Il link pubblico di ogni struttura è nel formato `ospitely.com/nome-struttura` — corto, leggibile, scrivibile a mano se il QR non è leggibile.

**Generazione slug (in onboarding)**
- L'host scrive il nome struttura → l'app propone in automatico uno slug (minuscolo, senza spazi/accenti, trattini al posto degli spazi, es. "Hotel Bellavista" → `hotel-bellavista`)
- Controllo di disponibilità in tempo reale su Supabase (vincolo di unicità **globale**, non per singolo host — due host diversi potrebbero avere strutture con lo stesso nome)
- Se occupato: l'app suggerisce alternative (`hotel-bellavista-2`, `hotel-bellavista-roma`) o l'host lo modifica manualmente
- Parole riservate bloccate (non registrabili come slug): `login`, `dashboard`, `admin`, `api`, `app`, `chat`, `pricing`, `about`, `signup`, ecc. — per non entrare in conflitto con le pagine reali dell'app

**Nota tecnica — routing su GitHub Pages**
GitHub Pages è hosting statico, senza server per gestire path dinamici arbitrari. Soluzione standard: una pagina `404.html` di fallback reindirizza verso `index.html` mantenendo il path originale via JavaScript; l'app legge poi `window.location.pathname`, estrae lo slug, e interroga Supabase per recuperare la struttura corrispondente. Gratuito, nessun servizio esterno aggiuntivo.

**Generazione QR code**
- Generato lato client con una libreria JS gratuita (es. `qrcode`/`qrcode.react`) — passa l'URL completo alla libreria, che disegna il codice come immagine SVG/PNG, zero costi e zero chiamate esterne
- L'host lo scarica dalla dashboard (PNG o PDF pronto da stampare)

**Rinomina struttura**
Se l'host cambia nome struttura, lo slug cambia di conseguenza e il vecchio link smette di funzionare — **nessun redirect mantenuto in automatico**. In dashboard, al momento della rinomina, l'host riceve un avviso chiaro che copre due aspetti:
1. "Rinominando la struttura il link e il QR code cambiano — dovrai scaricare e ristampare il nuovo QR code prima che i vecchi smettano di funzionare."
2. "Il vecchio indirizzo (`ospitely.com/vecchio-slug`) tornerà disponibile e potrà essere registrato da un'altra struttura, anche di un host diverso."

Scelta più semplice da mantenere lato sistema (nessuna tabella di redirect storici né slug "riservati per sempre" da gestire) e mette la responsabilità in mano all'host in modo esplicito e trasparente.

---

## 4. Flussi utente

### Flusso Host (registrazione + onboarding)
1. Registrazione account: nome/cognome, email, telefono/WhatsApp, scelta piano → checkout Stripe
2. Onboarding: crea prima struttura compilando il property profile completo (incluso numero camere dichiarato)
3. Riceve QR code/link univoco da stampare e mettere in camera
4. Per ogni prenotazione: crea un **soggiorno** (date check-in/check-out) → il sistema genera un codice a 6 caratteri, che l'host comunica all'ospite fuori dall'app (a voce, su carta, in un messaggio di conferma)
5. Dashboard: storico alert, conversazioni anonimizzate, contatore messaggi usati/mese, storico soggiorni/codici per struttura, possibilità di revocare un soggiorno in anticipo

### Flusso Ospite
1. Scansiona QR → apre link `ospitely.com/nome-struttura` (slug leggibile, no ID/percorsi lunghi — pensato per essere anche scrivibile a mano se il QR non funziona)
2. **Prima di poter chattare, inserisce il codice soggiorno** ricevuto dall'host — il sistema verifica che sia valido per quella struttura, in corso di validità (tra check-in e check-out + 1 giorno di margine), non revocato, e che il dispositivo non superi il limite di 2 per codice (vedi sezione 4B)
3. Se valido, il codice resta "ricordato" sul telefono per tutto il soggiorno — non va reinserito a ogni messaggio
4. L'interfaccia (bottoni, etichette, messaggi di sistema) si traduce automaticamente in base alla lingua rilevata dalle impostazioni del telefono dell'ospite — *non solo le risposte generate da Claude, ma l'app nel suo complesso* (salvo che l'host abbia scelto di limitare l'app a italiano + una sola lingua aggiuntiva, vedi sezione 7 punto 10)
5. Messaggio di benvenuto automatico multilingua (IT/EN/FR/DE): *"Scrivi pure nella tua lingua"*
6. Ospite scrive nella sua lingua → il sistema rileva la lingua dal testo, recupera il `property_profile` (in italiano), lo passa come contesto a Claude insieme alla domanda → risposta generata nella lingua dell'ospite
7. Pulsante sempre visibile "Segnala un problema"

**Autenticazione host**: magic link via Supabase Auth (email senza password) — target non tecnico, zero frizione, nessuna password da recuperare.

---

## 4B. Codice soggiorno — accesso limitato ai soli ospiti reali

Il link/QR resta statico e pubblico, ma **non basta più da solo** ad accedere alla chat: serve un codice legato a un soggiorno reale con date precise. Risolve due problemi concreti: il link che finisce in mano a estranei, e un host con più strutture che riusa lo stesso QR/servizio su strutture non dichiarate nel piano.

**Creazione codice (lato host)**
- Per ogni prenotazione, l'host crea un "soggiorno" in dashboard: solo due date (check-in/check-out)
- Il sistema genera un codice breve (6 caratteri alfanumerici, es. `7XK2P9`)
- **Durata massima 7 notti**: soggiorni più lunghi richiedono che l'host crei un nuovo codice allo scadere — evita codici aperti a tempo indeterminato
- **Controllo capacità automatico**: il database blocca la creazione di un nuovo codice se, per le date richieste, i soggiorni già attivi eguagliano il numero di camere dichiarate per quella struttura — controllo per **sovrapposizione di date**, non conteggio totale (una struttura con 3 camere può avere decine di soggiorni in sequenza nell'anno, il vincolo è quanti sono attivi *nello stesso periodo*)
- **Revoca anticipata**: se un ospite parte prima del previsto, l'host chiude il soggiorno dalla dashboard, liberando subito quella capacità per un nuovo codice

**Verifica codice (lato ospite)**
- Prima di aprire la chat, l'ospite inserisce il codice ricevuto dall'host
- Il sistema verifica: codice esistente per **quella specifica struttura**, non revocato, oggi compreso tra check-in e check-out (+1 giorno di margine per chi scrive dopo il check-out per un problema tardivo)
- Se valido, il frontend salva `soggiorno_id` in locale sul dispositivo — l'ospite non lo reinserisce più per tutta la durata del soggiorno
- La validità viene **ri-verificata ad ogni messaggio** (non solo all'ingresso): se l'host revoca il soggiorno a metà, l'accesso si chiude subito, non solo al prossimo tentativo di login

**Limite messaggi proporzionale alla durata**
- Ogni soggiorno ha un tetto messaggi calcolato in automatico alla creazione: `30 messaggi base + 12 per ogni notte oltre la prima` — un soggiorno di 1 notte ha un tetto di 30, uno di 7 notti (il massimo) arriva a 102
- Il conteggio vive sul soggiorno stesso, non sulla conversazione o sul dispositivo — resta corretto anche se l'ospite cancella i dati del browser e deve reinserire il codice
- Costo per Ospitely anche nel caso limite (102 messaggi): circa €0,24 per soggiorno — trascurabile rispetto al ricavo del piano

**Limite dispositivi: massimo 2 per codice**
- Ogni dispositivo che usa un codice viene registrato con un ID anonimo generato dal browser (salvato in locale, nessun dato personale)
- Dal terzo dispositivo diverso, l'accesso è rifiutato con un messaggio che invita a contattare l'host
- Limite onesto: se l'ospite cancella i dati del browser, il dispositivo "dimentica" il proprio ID e risulta nuovo — è una protezione contro la condivisione ampia/casuale, non un sistema a prova di tutto, ma efficace per lo scopo

**Protezione contro tentativi ripetuti (brute-force)**
- Un codice a 6 caratteri è indovinabile con tentativi ripetuti automatici — il sistema conta i tentativi falliti per IP (hashato, non salvato in chiaro) e blocca temporaneamente oltre 10 tentativi in 10 minuti
- I tentativi con codice inesistente contano come fallimento; i codici scaduti/revocati no (sono casi legittimi, non un attacco)

**Perché risolve entrambi i problemi originali**
- *Link condiviso con estranei*: senza un codice valido e in corso di validità, la chat non si apre
- *Host con più strutture che riusa lo stesso QR*: ogni codice è legato a una `property_id` specifica — riusarlo su un'altra struttura non dichiarata semplicemente non funziona. In più, ora esiste un dato **esatto** (numero di soggiorni creati al mese per struttura) da confrontare con le camere dichiarate, non più solo una stima statistica

---

## 5. Gestione segnalazioni

**🚨 Urgente** → l'ospite sceglie tra tre canali, tutti gratuiti (link nativi del dispositivo):
- **WhatsApp**: link `wa.me/...` precompilato — *"🚨 URGENTE - [Nome struttura]: [descrizione]"*
- **Chiamata diretta**: link `tel:+39...`
- **SMS**: link `sms:+39...&body=...` precompilato
- Salvato in `alerts` con tipo=urgente, canale_scelto

**✉️ Non urgente** → l'ospite sceglie tra:
- WhatsApp (canale preferito)
- SMS come alternativa
- Salvato in `alerts` con tipo=non_urgente, canale_scelto
- Nessuna email automatica di riepilogo (WhatsApp/SMS coprono già tutto)

**Dove resta l'email (Resend)**: solo autenticazione host (conferma registrazione, reset password). Ben sotto la soglia free di 3.000 email/mese anche con 100 strutture attive.

---

## 6. Autenticazione host

- Magic link via Supabase Auth (nessuna password da gestire)
- Resend configurato come SMTP custom in Supabase Auth
- Sessione lunga "ricordami" per evitare login frequenti
- Resend supera il limite del piano free Supabase Auth (3-4 email/ora)

---

## 7. Configurazione struttura (property profile)

Campi compilati dall'host, in italiano, una sola volta — la traduzione verso la lingua dell'ospite avviene a runtime via Claude (nessun servizio di traduzione esterno, nessuna versione multilingua da mantenere).

1. **Dati identificativi** — nome struttura, tipo (Hotel/B&B/affittacamere/affitto turistico/casa vacanze — determina anche quali altre sezioni del form sono rilevanti, es. la colazione), indirizzo, piano/citofono
2. **Check-in/Check-out** — orario check-in (+ eventuale late check-in, a pagamento o no), orario check-out (+ eventuale late check-out, a pagamento o no), modalità (self check-in con codice / accoglienza di persona / altro), codice cassetta chiavi o istruzioni self check-in, con possibilità di allegare un link video dell'host
3. **Colazione** *(visibile per Hotel/B&B/affittacamere)* — orario, dove si svolge (sala interna/bar convenzionato/in camera), tipo (dolce/salata/internazionale/self-service/servita), note intolleranze/opzioni vegane
4. **WiFi e utenze** — nome rete, password, note TV/clima/riscaldamento
5. **Regole della casa** — orario silenzio, policy fumo/animali/ospiti esterni, altre regole
6. **Contatti ed emergenze** — numero host emergenze, WhatsApp host, contatti extra utili (es. medico convenzionato, farmacia di turno)
7. **Mezzi e trasporti** — fermata bus/tram vicina + linee, stazione, aeroporto, parcheggio
8. **Consigli locali** *(ripetibili, 3-5 voci)* — ristoranti, bar, attrazioni, supermercato/farmacia/bancomat
9. **Domande frequenti personalizzate** *(ripetibili)* — "domanda tipica ospiti" + "risposta", per casi specifici della struttura
10. **Lingua e tono** — l'host compila una sola volta in italiano; sceglie il tono dell'assistente (formale/amichevole/informale); sceglie inoltre tra **app solo in italiano + un'altra lingua a sua scelta** oppure **riconoscimento automatico della lingua dell'ospite** dalle impostazioni del telefono, per un'esperienza più completa. Campo facoltativo **"Note per la traduzione"**, con una breve descrizione visibile in form (*"Usa questo campo per dare istruzioni su come Claude deve tradurre le tue risposte — es. termini da non tradurre, un tono più formale in altre lingue, ecc."*) — non sostituisce mai la regola fissa di sistema: i nomi propri di locali/attività non si traducono mai, a prescindere da cosa scrive l'host qui

> **Nota tecnica sul multilinguismo**: Claude legge il profilo struttura in italiano e traduce automaticamente la risposta nella lingua dell'ospite — nessuna versione tradotta da salvare o mantenere. Quando l'host sceglie il riconoscimento automatico, anche l'interfaccia dell'app (non solo le risposte in chat) si traduce di conseguenza.

---

## 8. Template email (Supabase Auth → Resend)

### 1. Conferma registrazione
**Oggetto:** Conferma il tuo account — Ospitely

```
Ciao [Nome],

Grazie per aver creato il tuo account su Ospitely.

Per attivare il tuo account e iniziare a configurare la tua struttura,
conferma il tuo indirizzo email cliccando sul pulsante qui sotto:

[CONFERMA IL TUO ACCOUNT]

Se non hai richiesto tu questa registrazione, puoi ignorare questa email.

A presto,
Il team di Ospitely
```

### 2. Reset password
**Oggetto:** Reimposta la tua password — Ospitely

```
Ciao,

Hai richiesto di reimpostare la password del tuo account Ospitely.

Clicca sul pulsante qui sotto per creare una nuova password:

[REIMPOSTA PASSWORD]

Questo link è valido per 1 ora. Se non hai richiesto tu questa modifica,
ignora pure questa email: la tua password attuale resterà invariata.

A presto,
Il team di Ospitely
```

### 3. Benvenuto dopo prima configurazione struttura *(opzionale, non è email di Auth)*
**Oggetto:** La tua struttura [Nome Struttura] è pronta!

```
Ciao [Nome],

Ottimo lavoro! Hai completato la configurazione di [Nome Struttura].

Ecco il link/QR code da stampare e mettere a disposizione dei tuoi ospiti:
[LINK CHAT OSPITI]
[QR CODE]

Da questo momento, i tuoi ospiti potranno chattare con l'assistente in
qualsiasi lingua, 24 ore su 24, e tu riceverai direttamente su WhatsApp/SMS
eventuali segnalazioni urgenti.

Buon lavoro,
Il team di Ospitely
```

---

## 9. Tariffario

*Nota in tutti i piani: il numero di camere dichiarato viene verificato; dichiarazioni non veritiere rendono l'abbonamento nullo.*

### Piano Singola Struttura — prezzo scalare in base al numero di camere

| Fascia camere | Prezzo/mese | €/camera (al massimo fascia) |
|---|---|---|
| 1-2 | €9,90 | €4,95 |
| 3-4 | €14,90 | €3,73 |
| 5-7 | €24,90 | €3,56 |
| 8-10 | €34,90 | €3,49 |
| 11-15 | €49,90 | €3,33 |
| 16-30 | €79,90 | €2,66 |
| 31-60 | €120,00 | €2,00 |
| 61-100 | €180,00 | €1,80 |

Prezzo per camera decrescente salendo di fascia (sconto di volume naturale); fasce entry/mid-market con prezzo "ottico" (`,90`), ultime due fasce enterprise con prezzo tondo per comunicare maggiore solidità B2B.

### Piano Multi-struttura (fino a 5 strutture)
- Formula: (somma dei prezzi per fascia di ogni struttura) × 0,85 (**sconto 15%**)
- Ogni struttura ha la sua fascia indipendente in base alle camere dichiarate

**Esempi di combinazione**

| Combinazione | Prezzo pieno | Prezzo Multi (-15%) |
|---|---|---|
| 2× (1-2 camere) | €19,80 | €16,83 |
| 3× (1-2 camere) | €29,70 | €25,25 |
| 5× (1-2 camere) | €49,50 | €42,08 |
| 2× (3-4 camere) | €29,80 | €25,33 |
| 1×(1-2) + 1×(3-4) | €24,80 | €21,08 |
| 2× (5-7 camere) | €49,80 | €42,33 |
| 2×(8-10) + 1×(5-7) | €94,70 | €80,50 |
| 3× (11-15 camere) | €149,70 | €127,25 |
| 2×(16-30) + 1×(31-60) | €279,80 | €237,83 |

*(qualsiasi altra combinazione segue la stessa formula: somma dei prezzi per fascia × 0,85)*

### Margine rispetto al costo API Claude (scenario worst-case)

*Worst-case = piena occupazione tutto il mese + ogni ospite consuma l'intero tetto messaggi del proprio soggiorno (vedi sezione 4B). Costo stimato: ~€1,20/camera/mese in questo scenario estremo.*

| Fascia camere | Costo API worst-case | Prezzo/mese | Margine | Margine % |
|---|---|---|---|---|
| 1-2 | €2,40 | €9,90 | €7,50 | 75,8% |
| 3-4 | €4,80 | €14,90 | €10,10 | 67,8% |
| 5-7 | €8,40 | €24,90 | €16,50 | 66,3% |
| 8-10 | €12,00 | €34,90 | €22,90 | 65,6% |
| 11-15 | €18,00 | €49,90 | €31,90 | 63,9% |
| 16-30 | €36,00 | €79,90 | €43,90 | 54,9% |
| 31-60 | €72,00 | €120,00 | €48,00 | 40,0% |
| 61-100 | €120,00 | €180,00 | €60,00 | 33,3% |

Margine sempre positivo anche nello scenario più estremo possibile — decresce in percentuale salendo di fascia (normale per un pricing a volume) ma resta solido, cresce sempre in valore assoluto.

### Gestione upgrade piani (automatizzata via Stripe Webhooks)

**Setup iniziale (una tantum)**
- Su Stripe si creano i prodotti/prezzo per ciascuna fascia (singola e multi-struttura)
- Per ogni fascia, un Payment Link o Checkout Session — l'host clicca, paga, Stripe gestisce carta/ricevuta/rinnovo automatico
- Un webhook Stripe punta a una Supabase Edge Function (stesso stack, nessun servizio esterno aggiuntivo)

**Flusso automatico al pagamento**
1. Host clicca "Passa a Piano X" → Stripe Checkout
2. Pagamento confermato → Stripe invia un evento webhook (`checkout.session.completed` o `customer.subscription.updated`)
3. La Edge Function riceve l'evento, verifica la firma (sicurezza), legge l'ID cliente Stripe, trova l'host corrispondente su Supabase
4. Aggiorna in automatico `max_properties` sulla tabella `hosts`
5. L'host torna in dashboard e vede subito sbloccato "Aggiungi struttura" — zero intervento manuale

**Collegamento tecnico Stripe ↔ Supabase**
- Al momento del checkout, l'ID Supabase dell'host viene salvato come metadata sul cliente Stripe, così il webhook sa sempre quale host aggiornare

**Downgrade/cancellazione (stesso meccanismo, automatico)**
- Cancellazione o pagamento fallito → Stripe invia `customer.subscription.deleted` o `invoice.payment_failed`
- La stessa Edge Function riporta `max_properties` al piano gratuito/base o sospende l'accesso, senza controlli manuali

**Costi**
- Edge Function inclusa nel piano free Supabase (500k invocazioni/mese gratuite)
- Costo Stripe: ~1,5% + €0,25 per transazione (carte EU)

### Protezione condivisione abbonamento
- **Il piano paga la struttura, non l'account**: anche se più persone condividono le stesse credenziali, il sistema conta sempre quante `properties` risultano collegate a quell'host — se il piano include 1 struttura e ne compaiono 3 con indirizzi in città diverse, è un segnale d'allarme visibile in dashboard admin
- **Rate limiting per `property_id`, non per host**: ogni struttura ha il proprio contatore messaggi/mese separato
- **Blocco creazione struttura oltre il piano**: se il piano attivo include 1 struttura, il sistema impedisce di crearne una seconda sotto lo stesso host finché non si passa al piano multi-struttura
- Verifica indirizzo/nome struttura in fase di setup
- Notifica accesso nuovo dispositivo *(opzionale, futura)*

---

## 10. Stima costi mensili (100 strutture attive)

| Voce | Costo |
|---|---|
| GitHub Pages | €0 |
| Supabase (piano free) | €0 (fino a 500MB DB) |
| Resend (email auth) | €0 (sotto 3.000 email/mese) |
| Notifiche segnalazioni (WhatsApp/SMS/tel) | €0 (link nativi) |
| Claude API (Haiku, ~1.000 conversazioni/mese) | €25-70 |
| Stripe commissioni | ~1,5%+€0,25 per transazione |
| Dominio | ~€10-25/anno |
| **Totale fisso stimato** | **€25-70/mese variabile API** |

Con 100 strutture anche solo nella fascia più bassa (1-2 camere, €9,90): €990/mese ricavi. Margine ampio.

---

## 11. Branding e dominio

**Nome definitivo**: **Ospitely**

- `ospitely.com` — €11,72 primo anno / €18,04 rinnovo ✅ (dominio principale)
- `ospitely.app` — €13,53 primo anno / €24,36 rinnovo ✅ (riserva/redirect)
- Costo totale primo anno registrando entrambi: ~€25

**Perché Ospitely**
- Richiama "ospite"/"ospitalità" in italiano e suona naturale in inglese (suffisso "-ly" tipico dei prodotti SaaS)
- Nessun conflitto trovato con aziende, app o marchi esistenti nel settore
- `.com` disponibile a prezzo normale di registrazione (raro nel settore, molti nomi alternativi erano in mano a rivenditori/speculatori a cifre da centinaia a centinaia di migliaia di euro)

**Verifiche ancora da fare prima della registrazione definitiva** (manuali, non automatizzabili via ricerca web):
- Handle social: instagram.com/ospitely, x.com/ospitely, tiktok.com/@ospitely, linkedin.com/company/ospitely, facebook.com/ospitely
- Banche dati marchi: UIBM (uibm.gov.it/bancadati), TMview (tmdn.org/tmview), WIPO Global Brand Database (branddb.wipo.int) — cercare "Ospitely" filtrando per classi di Nizza 42 (software/SaaS) e 43 (servizi di alloggio)

### Registrazione del marchio — piano e costi

**Strategia decisa**: si parte con il **marchio nazionale italiano** (UIBM). Marchio europeo (EUIPO) e internazionale (Sistema di Madrid, WIPO) solo in un secondo momento, quando ci sarà trazione reale fuori dai confini italiani — non registrare "ovunque" preventivamente, non protegge di più e costa molto.

**Classi di Nizza scelte (3 classi)**:
- **42** — Software/SaaS (classe principale, il prodotto è uno strumento tecnologico)
- **43** — Servizi di alloggio/hospitality (protezione difensiva: il nome è vicino al settore hospitality anche se Ospitely non offre ospitalità in prima persona)
- **35** — Servizi commerciali/gestione aziendale (Ospitely aiuta l'host a gestire la propria attività)

**Costi marchio nazionale italiano, 3 classi**:

| Voce | Costo |
|---|---|
| Tassa UIBM (1 classe) | €101 |
| Imposta di bollo (deposito telematico) | €48 |
| 2 classi aggiuntive (42+43+35) | +€68 (€34 × 2) |
| **Totale se depositato in autonomia** | **~€217** |
| Con assistenza legale (onorari inclusi) | ~€1.000-1.300 |

**Durata**: 10 anni dalla registrazione, rinnovabile indefinitamente ogni 10 anni. Non serve dimostrare un uso commerciale già in corso per registrare (regola italiana dell'intenzione d'uso) — ma dopo 5 anni senza uso effettivo in una classe, quella classe specifica rischia la decadenza per non-uso.

**Importante**: la registrazione del marchio non è un prerequisito per vendere — Ospitely può essere venduto in tutto il mondo da subito, a prescindere da dove/se il marchio è registrato. Il marchio protegge solo il nome da conflitti e imitazioni nei territori dove è registrato; il rischio di non registrare in un paese si concretizza solo se e quando lì si sviluppa un mercato reale.

**Prossimi passi quando si estenderà oltre l'Italia**:
- Marchio UE (EUIPO): ~€850-900 di tasse per 1-2 classi (~€1.500-2.400 con assistenza legale)
- Estensione internazionale (Sistema di Madrid, WIPO): richiede un marchio di base già registrato (italiano o UE); tassa base WIPO ~€700-960 + tassa ufficio d'origine (€255,86 se base italiana) + tassa individuale per ciascun paese scelto — strategia "a macchia di leopardo", solo sui paesi dove si opera concretamente, non un deposito globale indiscriminato

---

## 12. Punti ancora da definire (pending)

1. ~~Permettere correzioni manuali delle traduzioni per le lingue principali~~ — **deciso**: no, andrebbe contro il punto di forza "zero manutenzione" del prodotto. Al suo posto: campo facoltativo "Note per la traduzione" nel property profile (vedi sezione 7, punto 10), più una regola fissa di sistema (mai tradurre nomi propri di locali/attività).
2. ~~Definire il flusso dashboard host nel dettaglio~~ — **deciso**: approccio mobile-first. Struttura a 4 sezioni principali (Home, Soggiorni, Segnalazioni, Profilo struttura) con barra di navigazione in basso, più "Account e abbonamento" in menu secondario. Wireframe testuale definito, incluse le due funzioni "estendi soggiorno" (riusa gli stessi controlli del trigger di capacità/durata, che scatta anche su UPDATE) e apertura dettaglio segnalazione al tap. Resta da scrivere il codice quando si passa al frontend.
3. ~~Rate limiting messaggi per conversazione~~ — **deciso**: tetto dinamico legato alla durata del soggiorno, `30 + (notti - 1) × 12`, calcolato in automatico alla creazione del soggiorno (vedi sezione 4B). Da monitorare con l'uso reale e correggere le costanti se necessario.
4. ~~Notifica "nuovo accesso da nuovo dispositivo"~~ — **deciso**: non implementata. Il limite di 2 dispositivi per soggiorno è già una barriera dura (blocco automatico al terzo, non un semplice avviso), quindi una notifica aggiuntiva darebbe poco valore reale rispetto al costo di implementarla. L'host può comunque consultare lo storico dispositivi in dashboard quando vuole. Da rivalutare in futuro solo se richiesta esplicitamente dagli host reali.
5. **Registrazione formale del marchio** — piano definito (vedi sezione 11): marchio nazionale italiano, classi 42+43+35, ~€217 in autonomia o ~€1.000-1.300 con assistenza legale. Resta da completare le verifiche social/banche dati e procedere col deposito effettivo — azione pratica dell'utente, non tecnica.
