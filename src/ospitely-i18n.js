// ============================================================
// OSPITELY — Traduzioni interfaccia statica (chat ospite)
// Copre le 4 lingue del messaggio di benvenuto (IT/EN/FR/DE) — le
// risposte generate da Claude restano comunque tradotte in QUALSIASI
// lingua a runtime (vedi system prompt in chat-ospite), questo modulo
// serve solo per i testi FISSI dell'interfaccia (bottoni, placeholder,
// messaggi di errore), che altrimenti resterebbero sempre in italiano.
// ============================================================

const TRADUZIONI = {
  it: {
    benvenutoTitolo: 'Benvenuto',
    benvenutoSottotitolo: 'Inserisci il codice soggiorno che ti ha comunicato l\'host per iniziare a chattare',
    placeholderCodice: '7XK2P9',
    verificaCodice: 'Verifica codice',
    messaggioIniziale: 'Scrivi pure nella tua lingua, ti risponderò di conseguenza 🌍',
    placeholderInput: 'Scrivi un messaggio...',
    limiteInputPlaceholder: 'Limite messaggi raggiunto',
    segnalaProblema: 'Segnala un problema',
    contattaHost: 'Contatta l\'host per questa informazione →',
    limiteMessaggio: 'Hai raggiunto il limite di messaggi per questo soggiorno — usa "Segnala un problema" per contattare l\'host direttamente.',
    modaleTitolo: 'Segnala un problema',
    urgenteTitolo: '🚨 Urgente',
    urgenteSottotitolo: 'Contatta subito l\'host',
    nonUrgenteTitolo: '✉️ Scrivi un messaggio',
    nonUrgenteSottotitolo: 'L\'host lo vede quando può',
    placeholderDescrizione: 'Descrivi brevemente...',
    whatsapp: 'WhatsApp',
    chiama: 'Chiama',
    sms: 'SMS',
    erroreConnessione: 'Errore di connessione, riprova',
    erroreCodiceVuoto: 'Scrivi una breve descrizione prima di continuare',
  },
  en: {
    benvenutoTitolo: 'Welcome',
    benvenutoSottotitolo: 'Enter the stay code your host gave you to start chatting',
    placeholderCodice: '7XK2P9',
    verificaCodice: 'Verify code',
    messaggioIniziale: 'Feel free to write in your language, I\'ll reply accordingly 🌍',
    placeholderInput: 'Write a message...',
    limiteInputPlaceholder: 'Message limit reached',
    segnalaProblema: 'Report a problem',
    contattaHost: 'Contact the host about this →',
    limiteMessaggio: 'You\'ve reached the message limit for this stay — use "Report a problem" to contact the host directly.',
    modaleTitolo: 'Report a problem',
    urgenteTitolo: '🚨 Urgent',
    urgenteSottotitolo: 'Contact the host right away',
    nonUrgenteTitolo: '✉️ Send a message',
    nonUrgenteSottotitolo: 'The host will see it when they can',
    placeholderDescrizione: 'Briefly describe...',
    whatsapp: 'WhatsApp',
    chiama: 'Call',
    sms: 'SMS',
    erroreConnessione: 'Connection error, please try again',
    erroreCodiceVuoto: 'Write a short description before continuing',
  },
  fr: {
    benvenutoTitolo: 'Bienvenue',
    benvenutoSottotitolo: 'Entrez le code de séjour communiqué par votre hôte pour commencer à discuter',
    placeholderCodice: '7XK2P9',
    verificaCodice: 'Vérifier le code',
    messaggioIniziale: 'Écrivez dans votre langue, je vous répondrai en conséquence 🌍',
    placeholderInput: 'Écrivez un message...',
    limiteInputPlaceholder: 'Limite de messages atteinte',
    segnalaProblema: 'Signaler un problème',
    contattaHost: 'Contacter l\'hôte à ce sujet →',
    limiteMessaggio: 'Vous avez atteint la limite de messages pour ce séjour — utilisez "Signaler un problème" pour contacter l\'hôte directement.',
    modaleTitolo: 'Signaler un problème',
    urgenteTitolo: '🚨 Urgent',
    urgenteSottotitolo: 'Contactez l\'hôte immédiatement',
    nonUrgenteTitolo: '✉️ Envoyer un message',
    nonUrgenteSottotitolo: 'L\'hôte le verra dès que possible',
    placeholderDescrizione: 'Décrivez brièvement...',
    whatsapp: 'WhatsApp',
    chiama: 'Appeler',
    sms: 'SMS',
    erroreConnessione: 'Erreur de connexion, réessayez',
    erroreCodiceVuoto: 'Écrivez une brève description avant de continuer',
  },
  de: {
    benvenutoTitolo: 'Willkommen',
    benvenutoSottotitolo: 'Gib den Aufenthaltscode ein, den dir dein Gastgeber mitgeteilt hat, um zu chatten',
    placeholderCodice: '7XK2P9',
    verificaCodice: 'Code überprüfen',
    messaggioIniziale: 'Schreib einfach in deiner Sprache, ich antworte entsprechend 🌍',
    placeholderInput: 'Nachricht schreiben...',
    limiteInputPlaceholder: 'Nachrichtenlimit erreicht',
    segnalaProblema: 'Problem melden',
    contattaHost: 'Gastgeber dazu kontaktieren →',
    limiteMessaggio: 'Du hast das Nachrichtenlimit für diesen Aufenthalt erreicht — nutze "Problem melden", um den Gastgeber direkt zu kontaktieren.',
    modaleTitolo: 'Problem melden',
    urgenteTitolo: '🚨 Dringend',
    urgenteSottotitolo: 'Gastgeber sofort kontaktieren',
    nonUrgenteTitolo: '✉️ Nachricht schreiben',
    nonUrgenteSottotitolo: 'Der Gastgeber sieht sie, sobald er kann',
    placeholderDescrizione: 'Kurz beschreiben...',
    whatsapp: 'WhatsApp',
    chiama: 'Anrufen',
    sms: 'SMS',
    erroreConnessione: 'Verbindungsfehler, bitte erneut versuchen',
    erroreCodiceVuoto: 'Schreib eine kurze Beschreibung, bevor du fortfährst',
  },
};

const LINGUE_SUPPORTATE = Object.keys(TRADUZIONI); // ['it', 'en', 'fr', 'de']

/**
 * Rileva la lingua del browser dell'ospite tra quelle supportate.
 * Fallback su 'it' se il browser usa una lingua non tra le 4 coperte
 * dall'interfaccia statica — le risposte di Claude restano comunque
 * multilingua illimitate, questo riguarda solo bottoni/etichette fisse.
 */
export function rilevaLinguaInterfaccia() {
  const codiceBrowser = (navigator.language || 'it').slice(0, 2).toLowerCase();
  return LINGUE_SUPPORTATE.includes(codiceBrowser) ? codiceBrowser : 'it';
}

/**
 * Ritorna la funzione di traduzione per la lingua indicata.
 * Uso: const t = creaTraduttore('en'); t('segnalaProblema') → 'Report a problem'
 */
export function creaTraduttore(lingua) {
  const dizionario = TRADUZIONI[lingua] || TRADUZIONI.it;
  return (chiave) => dizionario[chiave] ?? TRADUZIONI.it[chiave] ?? chiave;
}
