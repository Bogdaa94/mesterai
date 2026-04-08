import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import { searchScenarii, formatRAGContext } from './rag';

const API_KEY: string = Constants.expoConfig?.extra?.geminiApiKey ?? '';
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_PROMPT = `Ești Mester AI — un asistent priceput și prietenos pentru probleme casnice din România. Vorbești calm, direct și uman — ca un vecin meșter de încredere. Explici de ce, nu doar ce. Folosești termeni simpli, nu tehnici. Răspunsurile tale să fie clare și complete dar concise. Maximum 3-4 paragrafe scurte. Dacă problema e complexă, rezolvă pas cu pas dar fii succint. Nu repeta informații. Invită utilizatorul să întrebe mai multe dacă e necesar. La final menționezi materialele necesare și când să cheme un specialist. Răspunzi DOAR în română.`;

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: SYSTEM_PROMPT,
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// ── askMester cu RAG ──────────────────────────────────────────────────────────

export async function askMester(
  userMessage: string,
  category: string,
  conversationHistory: ChatMessage[],
  imageBase64?: string
): Promise<string> {
  const scenarii = await searchScenarii(userMessage, category);
  const ragContext = formatRAGContext(scenarii);

  if (ragContext) {
    console.log(`[RAG] ${scenarii.length} scenarii găsite pentru "${userMessage}"`);
  }

  const contextMessage = ragContext
    ? `Categoria problemei este: ${category}.\n\n${ragContext}`
    : `Categoria problemei este: ${category}.`;

  // ── Cu imagine: generateContent cu inline data ────────────────────────────
  if (imageBase64) {
    const historyText = conversationHistory
      .map(m => `${m.role === 'user' ? 'Utilizator' : 'Mester AI'}: ${m.text}`)
      .join('\n');

    const prompt = [
      contextMessage,
      historyText ? `\nIstoricul conversației:\n${historyText}` : '',
      `\nUtilizatorul a trimis o imagine și spune: ${userMessage || 'Analizează imaginea și identifică problema.'}`,
      '\nAnalizează imaginea, identifică problema vizibilă și oferă sfaturi de remediere.',
    ].join('');

    try {
      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
      ]);
      return result.response.text();
    } catch (error) {
      console.error('Gemini vision error:', error);
      throw error;
    }
  }

  // ── Fără imagine: chat normal ─────────────────────────────────────────────
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: contextMessage }],
      },
      {
        role: 'model',
        parts: [{ text: `Înțeles! Sunt pregătit să te ajut cu probleme de ${category}${ragContext ? ', am și context din baza de cunoștințe' : ''}.` }],
      },
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
    ],
  });

  try {
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (error) {
    console.error('Gemini error:', error);
    throw error;
  }
}
