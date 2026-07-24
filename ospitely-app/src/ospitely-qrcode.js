// ============================================================
// OSPITELY — Generazione QR code struttura
// Lato client (dashboard host, sezione Home o Profilo struttura).
// Richiede la libreria 'qrcode' (npm install qrcode), generata
// interamente nel browser: zero chiamate esterne, zero costi.
// ============================================================

import QRCode from 'qrcode';

const DOMINIO_BASE = 'https://ospitely.com';

/**
 * Costruisce il link pubblico completo della struttura a partire dallo slug.
 */
export function costruisciLinkStruttura(slug) {
  return `${DOMINIO_BASE}/${slug}`;
}

/**
 * Genera il QR code come Data URL PNG (stringa base64), pronta da
 * mettere in un tag <img src="..."> o da scaricare direttamente.
 *
 * `dimensione` in pixel, `margine` in "moduli" QR (non pixel) —
 * un margine troppo basso può rendere il codice illeggibile alla scansione.
 */
export async function generaQRCodePng(slug, opzioni = {}) {
  const { dimensione = 512, margine = 2 } = opzioni;
  const link = costruisciLinkStruttura(slug);

  return QRCode.toDataURL(link, {
    width: dimensione,
    margin: margine,
    errorCorrectionLevel: 'M', // buon compromesso leggibilità/densità per stampa
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Genera il QR code come stringa SVG — utile se lo si vuole incorporare
 * direttamente nella pagina (scala senza perdita, a differenza del PNG)
 * o comporre in un PDF vettoriale lato client.
 */
export async function generaQRCodeSvg(slug, opzioni = {}) {
  const { margine = 2 } = opzioni;
  const link = costruisciLinkStruttura(slug);

  return QRCode.toString(link, {
    type: 'svg',
    margin: margine,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Innesca il download del QR code come file PNG, con nome file
 * basato sullo slug (es. "ospitely-hotel-bellavista.png").
 */
export async function scaricaQRCodePng(slug, opzioni = {}) {
  const dataUrl = await generaQRCodePng(slug, opzioni);

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `ospitely-${slug}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================
// Esempio d'uso (nel componente dashboard, sezione Home)
// ============================================================
//
// import { generaQRCodePng, scaricaQRCodePng, costruisciLinkStruttura }
//   from './ospitely-qrcode.js';
//
// // Per mostrarlo a schermo:
// const dataUrl = await generaQRCodePng(struttura.slug);
// document.getElementById('anteprima-qr').src = dataUrl;
//
// // Per il pulsante "Scarica QR code":
// document.getElementById('bottone-scarica').addEventListener('click', () => {
//   scaricaQRCodePng(struttura.slug);
// });
//
// // Per mostrare il link testuale sotto il QR (utile se la scansione fallisce):
// document.getElementById('link-testuale').textContent = costruisciLinkStruttura(struttura.slug);
