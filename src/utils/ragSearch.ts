/**
 * ragSearch.ts — public API for RAG lookups from UI/service layers.
 * Wraps src/services/rag.ts and exposes a clean interface.
 */

import { searchScenarii, formatRAGContext, Scenariu } from '../services/rag';

export type { Scenariu };

/**
 * Search the RAG knowledge base and return up to 3 relevant scenarios.
 */
export async function searchRAG(
  query: string,
  categorie: string
): Promise<Scenariu[]> {
  return searchScenarii(query, categorie);
}

/**
 * Format RAG results into a Gemini-ready context string.
 */
export { formatRAGContext };
