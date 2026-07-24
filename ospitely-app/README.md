# Ospitely

Assistente AI multilingue per gli ospiti di strutture ricettive.

## Setup locale

```bash
npm install
cp .env.example .env   # poi compila i valori VITE_* reali
npm run dev
```

## Struttura del progetto

```
src/                          Frontend React (Vite + Tailwind)
  ospitely-app-router.jsx     Router principale (slug struttura vs pagine fisse)
  ospitely-app-context.jsx    Client Supabase, sessione host, struttura attiva
  ospitely-pagina-home.jsx    Landing page pubblica
  ospitely-registrazione-host.jsx   Form di registrazione + checkout Stripe
  ospitely-dashboard.jsx      Area host (Home, Soggiorni, Segnalazioni, Profilo)
  ospitely-onboarding-form.jsx      Form configurazione struttura (property profile)
  ospitely-chat-ospite.jsx    Chat pubblica lato ospite
  ospitely-aggiungi-struttura.jsx   Modale per aggiungere una struttura ulteriore
  ospitely-slug.js            Generazione/validazione slug struttura
  ospitely-qrcode.js          Generazione QR code lato client
  ospitely-fasce-prezzo.js    Listino condiviso (8 fasce camere)
  ospitely-i18n.js            Traduzioni interfaccia chat ospite (IT/EN/FR/DE)
  ospitely-privacy-policy.jsx / ospitely-termini-servizio.jsx / ospitely-cookie-policy.jsx

supabase/
  ospitely-schema.sql         Schema completo del database (tabelle, RLS, trigger)
  functions/                  Le 6 Edge Function, una cartella per ciascuna

public/
  404.html                    Trucco routing SPA per GitHub Pages
  CNAME                       Dominio personalizzato

.github/workflows/deploy.yml  Build + deploy automatico su push a main
```

## Deploy — checklist

1. **Supabase**: crea un progetto, esegui `supabase/ospitely-schema.sql` nell'SQL Editor,
   poi `supabase functions deploy` per ciascuna cartella in `supabase/functions/`
2. **Variabili d'ambiente**: vedi `.env.example` — quelle `VITE_*` vanno anche nei
   Repository Secrets di GitHub (Settings → Secrets and variables → Actions), le altre
   nei Secrets delle Edge Function Supabase
3. **Stripe**: crea gli 8 prodotti/prezzi ricorrenti mensili (uno per fascia), il coupon
   "sconto multi-struttura" (-15%), registra l'endpoint webhook (`/stripe-webhook`),
   attiva il Customer Portal
4. **Resend**: configuralo come SMTP custom in Supabase Auth
5. **GitHub Pages**: abilita Pages con sorgente "GitHub Actions" nelle impostazioni del
   repository; il workflow in `.github/workflows/deploy.yml` fa il resto a ogni push
6. **Dominio**: punta il DNS di `ospitely.com` verso GitHub Pages (record A/AAAA o CNAME
   secondo la [documentazione GitHub](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site))

## Cosa manca ancora (vedi conversazione di progetto per il dettaglio completo)

- Contenuti legali da far rivedere da un professionista prima della pubblicazione
  (le bozze in `src/ospitely-*-policy.jsx` e `ospitely-termini-servizio.jsx` sono punti
  di partenza, non testi definitivi)
- Registrazione del marchio, forma giuridica, aspetti fiscali — azioni pratiche, non tecniche
