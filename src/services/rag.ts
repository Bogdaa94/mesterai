import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Scenariu {
  id: string;
  titlu: string;
  problema: string;
  cuvinte_cheie: string[];
  solutie_rezumat: string;
  dificultate: string;
  timp_estimat: string;
  materiale: string[];
  cand_specialist: string;
  categorie: string;
}

// ─── Cuvinte comune de ignorat ────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'și', 'sau', 'la', 'de', 'că', 'în', 'pe', 'cu', 'un', 'o', 'a', 'al',
  'ale', 'ai', 'am', 'are', 'au', 'da', 'nu', 'se', 'sa', 'să', 'ma', 'mă',
  'mi', 'îmi', 'îți', 'lui', 'lor', 'cel', 'cea', 'cei', 'care', 'ce', 'cum',
  'când', 'unde', 'tot', 'toți', 'toate', 'este', 'e', 'era', 'fi', 'fost',
  'mai', 'dar', 'daca', 'dacă', 'acum', 'atunci', 'foarte', 'mult', 'putin',
  'puțin', 'fel', 'asa', 'așa', 'face', 'am', 'avem', 'aveți', 'trebuie',
  'pot', 'poti', 'poți', 'meu', 'mea', 'mele', 'tau', 'tău', 'lui', 'ei',
  'nostru', 'vostru', 'the', 'is', 'it', 'for',
]);

// ─── Extrage cuvinte cheie din query ──────────────────────────────────────────

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[.,!?;:()\[\]"']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// ─── Scor relevanță ───────────────────────────────────────────────────────────

function scoreScenariu(scenariu: Scenariu, queryKeywords: string[]): number {
  const scenariuKeywords = scenariu.cuvinte_cheie.map((k) => k.toLowerCase());
  const titluWords = scenariu.titlu.toLowerCase().split(/\s+/);
  const problemaWords = scenariu.problema.toLowerCase().split(/\s+/);

  let score = 0;
  for (const qk of queryKeywords) {
    // Match exact in cuvinte_cheie
    if (scenariuKeywords.some((sk) => sk === qk || sk.includes(qk) || qk.includes(sk))) {
      score += 3;
    }
    // Match in titlu
    if (titluWords.some((tw) => tw.includes(qk) || qk.includes(tw))) {
      score += 2;
    }
    // Match in problema
    if (problemaWords.some((pw) => pw.includes(qk) || qk.includes(pw))) {
      score += 1;
    }
  }
  return score;
}

// ─── Search principal ─────────────────────────────────────────────────────────

export async function searchScenarii(
  query: string,
  categorie: string
): Promise<Scenariu[]> {
  const queryKeywords = extractKeywords(query);

  if (queryKeywords.length === 0) return [];

  try {
    const ref = collection(db, 'rag_knowledge', categorie, 'scenarii');
    const snap = await getDocs(ref);

    const scored = snap.docs
      .map((d) => ({ scenariu: d.data() as Scenariu, score: 0 }))
      .map(({ scenariu }) => ({
        scenariu,
        score: scoreScenariu(scenariu, queryKeywords),
      }))
      .filter(({ score }) => score >= 2) // minim 2 puncte
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ scenariu }) => scenariu);

    return scored;
  } catch (error) {
    console.error('RAG search error:', error);
    return [];
  }
}

// ─── Formatare context pentru Gemini ─────────────────────────────────────────

export function formatRAGContext(scenarii: Scenariu[]): string {
  if (scenarii.length === 0) return '';

  const items = scenarii.map((s) =>
    `**${s.titlu}**
Problemă: ${s.problema}
Soluție: ${s.solutie_rezumat}
Materiale: ${s.materiale.join(', ')}
Dificultate: ${s.dificultate} | Timp: ${s.timp_estimat}
Când specialist: ${s.cand_specialist}`
  );

  return `Context relevant din baza noastră de cunoștințe:\n\n${items.join('\n\n---\n\n')}\n\nFolosește acest context ca bază pentru răspuns, dar adaptează la situația specifică a utilizatorului.`;
}
