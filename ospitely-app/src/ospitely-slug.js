// ============================================================
// OSPITELY — Generazione e validazione slug struttura
// Lato client (form onboarding), usa il client Supabase JS già
// inizializzato nel progetto (`supabase`).
// ============================================================

// Stessa lista di parole riservate presente nel constraint SQL
// (slug_non_riservato) — va tenuta sincronizzata se la modifichi.
const SLUG_RISERVATI = [
  'login', 'dashboard', 'admin', 'api', 'app', 'chat',
  'pricing', 'about', 'signup', 'register', 'logout',
  'settings', 'account', 'help', 'support', 'terms', 'privacy', 'cookie',
];

// Stesso pattern del CHECK constraint SQL (slug_formato_valido)
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 60;

/**
 * Converte il nome struttura scritto dall'host in uno slug pulito.
 * Es. "Hotel Bellavista, Roma!" → "hotel-bellavista-roma"
 */
export function generaSlug(nomeStruttura) {
  return nomeStruttura
    .normalize('NFD')                    // separa lettere e accenti (é → e + ́)
    .replace(/[\u0300-\u036f]/g, '')     // rimuove i segni diacritici
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')        // rimuove simboli non ammessi
    .replace(/[\s_]+/g, '-')             // spazi/underscore → trattino
    .replace(/-+/g, '-')                 // trattini multipli → uno solo
    .replace(/^-+|-+$/g, '')             // niente trattino a inizio/fine
    .slice(0, SLUG_MAX_LENGTH);
}

/**
 * Valida il formato dello slug (indipendentemente dalla disponibilità).
 * Ritorna { valido: boolean, errore?: string }
 */
export function validaFormatoSlug(slug) {
  if (!slug || slug.length < SLUG_MIN_LENGTH) {
    return { valido: false, errore: `Lo slug deve avere almeno ${SLUG_MIN_LENGTH} caratteri` };
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    return { valido: false, errore: `Lo slug non può superare ${SLUG_MAX_LENGTH} caratteri` };
  }
  if (!SLUG_REGEX.test(slug)) {
    return { valido: false, errore: 'Usa solo lettere minuscole, numeri e trattini singoli (es. hotel-bellavista)' };
  }
  if (SLUG_RISERVATI.includes(slug)) {
    return { valido: false, errore: 'Questo nome è riservato al sistema, scegline un altro' };
  }
  return { valido: true };
}

/**
 * Controlla su Supabase se lo slug è già in uso (unicità globale,
 * non solo per l'host corrente — vedi vincolo UNIQUE su properties.slug).
 * `escludiPropertyId` serve quando l'host sta rinominando una struttura
 * già esistente, per non "scontrarsi" con se stesso.
 */
export async function slugDisponibile(supabase, slug, escludiPropertyId = null) {
  let query = supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug);

  if (escludiPropertyId) {
    query = query.neq('id', escludiPropertyId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Errore nel controllo disponibilità slug: ${error.message}`);
  }

  return count === 0;
}

/**
 * Genera alternative disponibili quando lo slug proposto è occupato.
 * Prova prima con un numero progressivo (-2, -3, ...), poi con la città
 * se fornita, come fallback più leggibile.
 */
export async function suggerisciAlternative(supabase, slugBase, opzioni = {}) {
  const { citta = null, maxTentativi = 5 } = opzioni;
  const alternative = [];

  for (let i = 2; i <= maxTentativi && alternative.length < 3; i++) {
    const candidato = `${slugBase}-${i}`;
    if (await slugDisponibile(supabase, candidato)) {
      alternative.push(candidato);
    }
  }

  if (citta && alternative.length < 3) {
    const slugConCitta = generaSlug(`${slugBase}-${citta}`);
    if (slugConCitta !== slugBase && await slugDisponibile(supabase, slugConCitta)) {
      alternative.push(slugConCitta);
    }
  }

  return alternative;
}

/**
 * Funzione "tutto in uno" da chiamare nel form di onboarding:
 * genera lo slug dal nome, valida il formato, controlla la
 * disponibilità e — se occupato — propone alternative.
 *
 * Ritorna:
 *  { slug, disponibile: true }
 *  { slug, disponibile: false, errore, alternative: [...] }
 */
export async function elaboraSlugStruttura(supabase, nomeStruttura, opzioni = {}) {
  const slug = generaSlug(nomeStruttura);

  const formato = validaFormatoSlug(slug);
  if (!formato.valido) {
    return { slug, disponibile: false, errore: formato.errore, alternative: [] };
  }

  const disponibile = await slugDisponibile(supabase, slug, opzioni.escludiPropertyId);
  if (disponibile) {
    return { slug, disponibile: true };
  }

  const alternative = await suggerisciAlternative(supabase, slug, opzioni);
  return {
    slug,
    disponibile: false,
    errore: 'Questo indirizzo è già in uso da un\'altra struttura',
    alternative,
  };
}

// ============================================================
// Esempio d'uso (nel componente del form di onboarding)
// ============================================================
//
// import { elaboraSlugStruttura, validaFormatoSlug } from './ospitely-slug.js';
//
// const risultato = await elaboraSlugStruttura(supabase, "Hotel Bellavista");
//
// if (risultato.disponibile) {
//   // procedi al salvataggio: properties.slug = risultato.slug
// } else {
//   // mostra risultato.errore e i bottoni per risultato.alternative
// }
//
// // Se l'host modifica manualmente lo slug proposto, valida solo il formato
// // e poi richiama slugDisponibile() direttamente prima di salvare:
//
// const formatoOk = validaFormatoSlug(slugModificatoAMano);
