import React from 'react';
import LegalScreen, { LegalSection } from '../../components/LegalScreen';

const SECTIONS: LegalSection[] = [
  // 1. Despre Mester AI
  { type: 'heading', text: '1. Despre Mester AI' },
  { type: 'body', text: 'Mester AI („Aplicația", „Serviciul", „noi") este o platformă digitală de asistență pentru probleme de locuință, disponibilă pe iOS și Android, dezvoltată de [NUMELE TĂU / FIRMA TA], cu sediul în România.' },
  { type: 'body', text: 'Mester AI folosește inteligență artificială (modelul Gemini de la Google) pentru a oferi recomandări informative în domeniile: instalații sanitare, electricitate, construcții, grădină și mobilă/tâmplărie.' },
  { type: 'warning', text: '⚠️ AVERTISMENT IMPORTANT: Recomandările generate de Mester AI au caracter strict informativ și orientativ. Ele nu înlocuiesc consultarea unui specialist autorizat (instalator, electrician ANRE, constructor autorizat etc.) și nu constituie sfaturi profesionale. Mester AI nu este responsabil pentru nicio daună materială, personală sau financiară rezultată din aplicarea recomandărilor fără verificarea unui profesionist.' },

  // 2. Acceptarea Termenilor
  { type: 'heading', text: '2. Acceptarea Termenilor' },
  { type: 'body', text: 'Prin crearea unui cont și utilizarea Aplicației, confirmi că:' },
  { type: 'bullet', items: [
    'Ai cel puțin 16 ani',
    'Ai citit, înțeles și ești de acord cu acești Termeni',
    'Ești de acord cu Politica de Confidențialitate',
    'Ești de acord cu procesarea datelor tale de către sisteme AI externe (Google Gemini)',
  ]},
  { type: 'body', text: 'Dacă nu ești de acord, nu poți utiliza Aplicația.' },

  // 3. Contul tău
  { type: 'heading', text: '3. Contul Tău' },
  { type: 'subheading', text: '3.1 Creare cont' },
  { type: 'body', text: 'Poți crea cont prin: email și parolă, cont Google sau cont Apple (dacă disponibil).' },
  { type: 'body', text: 'Ești responsabil pentru confidențialitatea credențialelor tale. Notifică-ne imediat la contact@mesterai.ro dacă suspectezi acces neautorizat.' },
  { type: 'subheading', text: '3.2 Informații corecte' },
  { type: 'body', text: 'Ești obligat să furnizezi informații corecte și actualizate. Conturile cu informații false pot fi suspendate.' },
  { type: 'subheading', text: '3.3 Ștergerea contului' },
  { type: 'body', text: 'Poți șterge contul oricând din Setări → Cont → Șterge contul. Ștergerea este ireversibilă și implică eliminarea tuturor datelor conform GDPR Art. 17.' },

  // 4. Planuri și abonamente
  { type: 'heading', text: '4. Planuri și Abonamente' },
  { type: 'subheading', text: '4.1 Planul Free' },
  { type: 'bullet', items: [
    '3 conversații AI pe zi (resetare zilnică la miezul nopții)',
    'Acces la toate cele 5 categorii',
    'Vizualizare limitată forum (fără postare/comentare)',
    'Directorul de meșteri fără date de contact',
    'Fără funcții vocale',
  ]},
  { type: 'subheading', text: '4.2 Planul Pro' },
  { type: 'body', text: 'Prețuri curente: Lunar — 24,99 RON/lună | Anual — 224,99 RON/an (economisești 25%).' },
  { type: 'body', text: 'Planul Pro include:' },
  { type: 'bullet', items: [
    'Conversații AI nelimitate',
    'Acces complet Forum (postare, comentarii, puncte)',
    'Director meșteri cu date de contact și filtru distanță',
    'Input vocal',
    'Raport Casa Mea',
    'Reminder întreținere',
    'Calculator buget',
    'Scanare documente/schițe (Gemini Vision)',
  ]},
  { type: 'subheading', text: '4.3 Plăți și reînnoire' },
  { type: 'bullet', items: [
    'Plățile sunt procesate prin Apple App Store (iOS) sau Google Play (Android)',
    'Abonamentele se reînnoiesc automat la sfârșitul perioadei',
    'Poți anula oricând din setările contului App Store/Google Play cu cel puțin 24 de ore înainte de reînnoire',
    'Mester AI nu procesează direct date de card — toate plățile trec prin Apple/Google',
  ]},
  { type: 'subheading', text: '4.4 Rambursări' },
  { type: 'body', text: 'Rambursările sunt gestionate conform politicilor Apple App Store și Google Play. Mester AI nu oferă rambursări directe.' },
  { type: 'subheading', text: '4.5 Program Referral (doar Pro)' },
  { type: 'bullet', items: [
    'Utilizatorii Pro primesc un link unic de referral',
    'Cel care invită primește -40% luna următoare',
    'Cel invitat primește -20% prima lună',
    'Vizibil în pagina Paywall după activarea Pro',
  ]},
  { type: 'subheading', text: '4.6 Puncte și reduceri' },
  { type: 'body', text: 'Utilizatorii Pro câștigă puncte prin activitate în forum. Punctele pot reduce abonamentul anual cu maximum 40 RON.' },
  { type: 'warning', text: '💡 Reduceri disponibile pentru utilizatorii Pro:\n• Prin programul de referral: până la -40% la luna următoare\n• Prin punctele câștigate în forum: până la -40 RON la abonamentul anual\n• Cele două reduceri nu se cumulează în aceeași perioadă de facturare' },

  // 5. Utilizarea serviciului
  { type: 'heading', text: '5. Utilizarea Serviciului' },
  { type: 'subheading', text: '5.1 Utilizare permisă' },
  { type: 'bullet', items: [
    'Utilizare personală, necomercială',
    'Întrebări legate de problemele casei tale',
    'Participare constructivă în forum',
  ]},
  { type: 'subheading', text: '5.2 Utilizare interzisă' },
  { type: 'body', text: 'Este interzis să:' },
  { type: 'bullet', items: [
    'Utilizezi Aplicația pentru scopuri ilegale',
    'Postezi conținut ofensator, fals, periculos sau ilegal în forum',
    'Încerci să compromită securitatea sistemului',
    'Reproduci sau redistribui conținutul generat de AI în scop comercial fără acordul nostru',
    'Creezi conturi multiple pentru a ocoli limita zilnică Free',
    'Folosești Aplicația pentru a oferi sfaturi profesionale terților contra cost',
  ]},
  { type: 'subheading', text: '5.3 Forum și conținut utilizator' },
  { type: 'bullet', items: [
    'Ești responsabil pentru conținutul postat',
    'Mester AI poate modera, edita sau șterge orice conținut fără notificare prealabilă',
    'Postările cu 3+ voturi pozitive pot fi incluse în baza de cunoștințe AI',
    'Prin postare, acorzi Mester AI o licență neexclusivă de utilizare a conținutului în scopul îmbunătățirii serviciului',
  ]},
  { type: 'subheading', text: '5.4 Directorul de meșteri' },
  { type: 'bullet', items: [
    'Mester AI este doar o platformă de intermediere',
    'Nu verificăm calificările sau calitatea lucrărilor meșterilor listați',
    'Nu suntem responsabili pentru serviciile prestate de meșteri',
    'Înscrierea ca meșter implică o taxă unică de 1 EUR',
  ]},

  // 6. Inteligența artificială
  { type: 'heading', text: '6. Inteligența Artificială' },
  { type: 'subheading', text: '6.1 Natura răspunsurilor AI' },
  { type: 'bullet', items: [
    'Răspunsurile sunt generate automat de modelul Gemini (Google)',
    'Au caracter informativ și orientativ',
    'Nu constituie sfaturi de specialitate tehnice, juridice sau medicale',
    'Pot conține erori sau informații incomplete',
  ]},
  { type: 'subheading', text: '6.2 Responsabilitate AI' },
  { type: 'body', text: 'Mester AI nu este responsabil pentru: daune rezultate din aplicarea recomandărilor AI, erori tehnice sau inexactități în răspunsurile generate, decizii luate exclusiv pe baza output-ului AI.' },
  { type: 'subheading', text: '6.3 Transparență AI (conform EU AI Act)' },
  { type: 'bullet', items: [
    'Ești informat că interacționezi cu un sistem de inteligență artificială',
    'Toate răspunsurile AI sunt marcate vizibil în Aplicație',
    'Mesajele tale sunt transmise către Google Gemini pentru procesare',
    'Datele nu sunt folosite pentru antrenarea modelelor Gemini',
  ]},
  { type: 'subheading', text: '6.4 Supraveghere umană' },
  { type: 'body', text: 'Conform EU AI Act, Mester AI este clasificat ca sistem AI cu risc scăzut (asistență informativă generală). Nu luăm decizii automate cu impact semnificativ asupra utilizatorilor. Recomandăm întotdeauna consultarea unui specialist.' },

  // 7. Proprietate intelectuală
  { type: 'heading', text: '7. Proprietate Intelectuală' },
  { type: 'bullet', items: [
    'Aplicația, design-ul, logo-ul și conținutul editorial aparțin [NUMELE TĂU / FIRMA TA]',
    'Cele 75 de scenarii din baza de cunoștințe sunt proprietatea noastră',
    'Nu ai dreptul să copiezi, reproduci sau redistribui conținutul Aplicației',
  ]},

  // 8. Limitarea răspunderii
  { type: 'heading', text: '8. Limitarea Răspunderii' },
  { type: 'body', text: 'În măsura permisă de legea română, Mester AI nu este responsabil pentru:' },
  { type: 'bullet', items: [
    'Daune directe sau indirecte rezultate din utilizarea Aplicației',
    'Întreruperi temporare ale serviciului',
    'Pierderea datelor ca urmare a unor circumstanțe tehnice excepționale',
    'Conținut postat de utilizatori în forum',
  ]},
  { type: 'body', text: 'Răspunderea noastră maximă față de tine nu va depăși suma plătită pentru abonament în ultimele 3 luni.' },

  // 9. Modificări
  { type: 'heading', text: '9. Modificări ale Termenilor' },
  { type: 'body', text: 'Ne rezervăm dreptul de a modifica acești Termeni. Te vom notifica cu cel puțin 15 zile înainte prin notificare push în Aplicație și email la adresa înregistrată.' },
  { type: 'body', text: 'Continuarea utilizării după notificare constituie acceptarea noilor termeni. Dacă nu ești de acord, poți șterge contul înainte de data intrării în vigoare.' },

  // 10. Legea aplicabilă
  { type: 'heading', text: '10. Legea Aplicabilă' },
  { type: 'body', text: 'Acești Termeni sunt guvernați de legea română. Orice dispute vor fi soluționate de instanțele competente din România, cu respectarea legislației UE aplicabile (GDPR, EU AI Act, DSA).' },

  // 11. Contact
  { type: 'heading', text: '11. Contact' },
  { type: 'body', text: 'Email: contact@mesterai.ro' },
  { type: 'body', text: 'Website: mesterai.ro' },
  { type: 'body', text: 'Adresă: [ADRESA TA], România' },
  { type: 'spacer' },
  { type: 'body', text: 'Versiunea 1.0 — [DATA LANSĂRII]' },
];

export default function TermsScreen() {
  return (
    <LegalScreen
      title="Termeni și Condiții"
      updatedAt="[DATA LANSĂRII]"
      sections={SECTIONS}
    />
  );
}
