import React from 'react';
import LegalScreen, { LegalSection } from '../../components/LegalScreen';

const SECTIONS: LegalSection[] = [
  // 1. Introducere
  { type: 'heading', text: '1. Introducere' },
  { type: 'body', text: 'Mester AI respectă confidențialitatea ta. Această Politică explică cum colectăm, folosim și protejăm datele tale personale, conform Regulamentului General privind Protecția Datelor (GDPR - UE 2016/679) și legislației române aplicabile.' },
  { type: 'body', text: 'Operator de date: [NUMELE TĂU / FIRMA TA], România' },

  // 2. Datele colectate
  { type: 'heading', text: '2. Datele pe Care le Colectăm' },
  { type: 'subheading', text: '2.1 Date furnizate de tine' },
  { type: 'table',
    headers: ['Categorie', 'Date', 'Scop'],
    rows: [
      ['Cont', 'Nume, adresă email', 'Autentificare, comunicare'],
      ['Utilizare', 'Istoricul problemelor și conversațiilor AI', 'Funcționarea serviciului, RAG'],
      ['Forum', 'Postări, comentarii, voturi', 'Funcționarea forumului'],
      ['Meșteri', 'Date de contact, locație', 'Directorul de meșteri'],
      ['Consimțământ', 'Data și versiunea acceptării', 'Audit legal GDPR'],
    ],
  },
  { type: 'subheading', text: '2.2 Date colectate automat' },
  { type: 'table',
    headers: ['Categorie', 'Date', 'Scop'],
    rows: [
      ['Tehnice', 'Tip dispozitiv, OS, versiune app', 'Depanare tehnică'],
      ['Utilizare', 'Ultima activitate, frecvența utilizării', 'Îmbunătățirea serviciului'],
      ['Autentificare', 'Provider (email/Google/Apple), UID Firebase', 'Securitate cont'],
    ],
  },
  { type: 'subheading', text: '2.3 Date pe care NU le colectăm' },
  { type: 'bullet', items: [
    '❌ Date biometrice',
    '❌ Date despre sănătate',
    '❌ Date financiare sau de card',
    '❌ Locația în timp real',
    '❌ Contacte din telefon',
    '❌ Fotografii (funcție planificată exclusiv Pro)',
  ]},

  // 3. Cum folosim datele
  { type: 'heading', text: '3. Cum Folosim Datele' },
  { type: 'table',
    headers: ['Scop', 'Baza legală GDPR'],
    rows: [
      ['Furnizarea serviciului AI', 'Art. 6(1)(b) — executarea contractului'],
      ['Trimiterea mesajelor la Google Gemini', 'Art. 6(1)(a) — consimțământ explicit'],
      ['Salvarea istoricului în Firestore', 'Art. 6(1)(b) — executarea contractului'],
      ['Îmbunătățirea RAG (cunoștințe AI)', 'Art. 6(1)(f) — interes legitim'],
      ['Comunicări de marketing', 'Art. 6(1)(a) — consimțământ (opțional)'],
      ['Audit legal (consimțământ GDPR)', 'Art. 6(1)(c) — obligație legală'],
    ],
  },

  // 4. Cu cine partajăm datele
  { type: 'heading', text: '4. Cu Cine Partajăm Datele' },
  { type: 'subheading', text: '4.1 Google Gemini (procesare AI)' },
  { type: 'warning', text: '⚠️ Important: Mesajele tale și descrierile problemelor sunt transmise către Google LLC (SUA) pentru procesare prin modelul Gemini. Google nu folosește datele tale pentru antrenarea modelelor Gemini (conform Google Cloud Terms). Transfer internațional: SUA — protejat prin Clauze Contractuale Standard (SCC).' },
  { type: 'link', text: 'Politica de confidențialitate Google', url: 'https://policies.google.com/privacy' },
  { type: 'subheading', text: '4.2 Google Firebase (infrastructură)' },
  { type: 'bullet', items: [
    'Firebase Authentication — gestionarea conturilor',
    'Cloud Firestore — stocarea datelor',
    'Serverele sunt localizate în Europa (eu-west)',
  ]},
  { type: 'link', text: 'Google Cloud Data Processing Addendum', url: 'https://cloud.google.com/terms/data-processing-addendum' },
  { type: 'subheading', text: '4.3 RevenueCat (gestionare abonamente)' },
  { type: 'body', text: 'Procesează informații despre abonamentul tău. Nu primește date de card — acestea rămân la Apple/Google.' },
  { type: 'link', text: 'Politica de confidențialitate RevenueCat', url: 'https://www.revenuecat.com/privacy' },
  { type: 'subheading', text: '4.4 Apple / Google (plăți)' },
  { type: 'body', text: 'Procesează plățile pentru abonamente Pro. Datele financiare sunt gestionate exclusiv de Apple/Google.' },
  { type: 'subheading', text: '4.5 Nu vindem datele tale' },
  { type: 'body', text: 'Mester AI nu vinde, nu închiriază și nu comercializează datele tale personale către terți.' },

  // 5. Transferuri internaționale
  { type: 'heading', text: '5. Transferuri Internaționale' },
  { type: 'body', text: 'Datele tale pot fi transferate în afara UE (în special în SUA, unde operează Google). Aceste transferuri sunt protejate prin:' },
  { type: 'bullet', items: [
    'Clauze Contractuale Standard (SCC) aprobate de Comisia Europeană',
    'Decizia de adecvare UE-SUA (Data Privacy Framework)',
  ]},

  // 6. Cât timp păstrăm datele
  { type: 'heading', text: '6. Cât Timp Păstrăm Datele' },
  { type: 'table',
    headers: ['Categorie', 'Perioadă'],
    rows: [
      ['Date de cont', 'Până la ștergerea contului + 30 zile'],
      ['Istoricul conversațiilor', 'Până la ștergerea contului'],
      ['Consimțământ GDPR', '5 ani (obligație legală de audit)'],
      ['Date forum', 'Până la ștergerea contului / postării'],
      ['Date meșteri', 'Până la retragerea înscrierii + 30 zile'],
      ['Date anonimizate RAG', 'Nelimitat (nu conțin date personale)'],
    ],
  },

  // 7. Drepturile tale
  { type: 'heading', text: '7. Drepturile Tale (GDPR)' },
  { type: 'table',
    headers: ['Drept', 'Cum îl exerciți'],
    rows: [
      ['Acces — să știi ce date deținem', 'Email la contact@mesterai.ro'],
      ['Rectificare — corectarea datelor incorecte', 'Din Setări sau email'],
      ['Ștergere — „dreptul de a fi uitat"', 'Setări → Șterge contul (automat)'],
      ['Portabilitate — datele în format electronic', 'Email la contact@mesterai.ro'],
      ['Opoziție — să te opui prelucrării', 'Email la contact@mesterai.ro'],
      ['Retragere consimțământ', 'Setări → Confidențialitate'],
      ['Restricționare — limitarea prelucrării', 'Email la contact@mesterai.ro'],
    ],
  },
  { type: 'body', text: 'Răspundem în 30 de zile de la solicitare.' },

  // 8. Transparență AI
  { type: 'heading', text: '8. Transparență AI (EU AI Act)' },
  { type: 'bullet', items: [
    'Ești informat că Mester AI folosește sisteme AI generative',
    'Mester AI este clasificat ca sistem AI cu risc scăzut (asistență informativă)',
    'Toate răspunsurile AI sunt marcate vizibil în Aplicație',
    'Ai dreptul să soliciți explicații despre modul de funcționare al sistemului',
    'Ai dreptul să raportezi răspunsuri problematice (buton „Raportează" în Aplicație)',
    'Nu luăm decizii automate cu efect juridic sau impact semnificativ asupra ta',
  ]},
  { type: 'body', text: 'Procesorul AI: Google LLC, prin modelul Gemini 2.0 Flash.' },
  { type: 'body', text: 'Scopul procesării: Generarea de recomandări informative pentru probleme de locuință.' },

  // 9. Securitate
  { type: 'heading', text: '9. Securitatea Datelor' },
  { type: 'bullet', items: [
    'Criptare în tranzit: TLS 1.3',
    'Criptare la repaus: Firebase encryption at-rest',
    'Autentificare: Firebase Auth cu token-uri securizate',
    'Acces restricționat: Security Rules Firestore — fiecare utilizator accesează doar propriile date',
    'Audit trail: Consimțământul salvat cu timestamp pentru audit legal',
  ]},

  // 10. Copii și minori
  { type: 'heading', text: '10. Copii și Minori' },
  { type: 'body', text: 'Serviciul este destinat persoanelor cu vârsta minimă de 16 ani (conform GDPR Art. 8 pentru România). Nu colectăm intenționat date de la persoane sub 16 ani. Dacă descoperim că am colectat astfel de date, le vom șterge imediat.' },

  // 11. Cookie-uri
  { type: 'heading', text: '11. Cookie-uri și Tracking' },
  { type: 'body', text: 'Aplicația mobilă Mester AI nu folosește cookie-uri. Firebase poate utiliza identificatori de dispozitiv pentru funcționalitate (nu pentru publicitate). Nu urmărim comportamentul tău în scopuri publicitare.' },

  // 12. Modificări
  { type: 'heading', text: '12. Modificări ale Politicii' },
  { type: 'body', text: 'Vom notifica utilizatorii cu cel puțin 15 zile înainte de orice modificare semnificativă. La modificarea Politicii, versiunea consimțământului se incrementează și vom solicita acceptarea din nou.' },

  // 13. ANSPDCP
  { type: 'heading', text: '13. Autoritatea de Supraveghere' },
  { type: 'body', text: 'Ai dreptul să depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).' },
  { type: 'link', text: 'anspdcp.ro', url: 'https://www.anspdcp.ro' },
  { type: 'body', text: 'Email: anspdcp@dataprotection.ro | Telefon: +40.318.059.211' },

  // 14. Contact
  { type: 'heading', text: '14. Contact' },
  { type: 'body', text: 'Email: contact@mesterai.ro' },
  { type: 'body', text: 'Website: mesterai.ro' },
  { type: 'body', text: 'Adresă: [ADRESA TA], România' },
  { type: 'body', text: 'Răspundem în maxim 30 de zile lucrătoare.' },

  // 15. DSA
  { type: 'heading', text: '15. Digital Services Act (DSA)' },
  { type: 'body', text: 'Mester AI include un forum unde utilizatorii pot posta conținut. Conform DSA:' },
  { type: 'bullet', items: [
    'Ai dreptul să raportezi conținut ilegal sau dăunător',
    'Moderăm conținutul raportat în termen de 72 de ore',
    'Poți contesta deciziile de moderare prin email la contact@mesterai.ro',
  ]},
  { type: 'spacer' },
  { type: 'body', text: 'Versiunea 1.0 — [DATA LANSĂRII] | Mester AI — [NUMELE TĂU / FIRMA TA], România' },
];

export default function PrivacyScreen() {
  return (
    <LegalScreen
      title="Politică de Confidențialitate"
      updatedAt="[DATA LANSĂRII]"
      sections={SECTIONS}
    />
  );
}
