import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyAGdEubrtNwvBbWuY2yckb_lkQtCmyZ0w8';
const genAI = new GoogleGenerativeAI(API_KEY);

// ── Listare modele disponibile (DEV) ──────────────────────────────────────────

async function listAvailableModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    const data = await response.json();
    console.log('Modele disponibile:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Eroare listare modele:', error);
  }
}

listAvailableModels();

// ── Model ─────────────────────────────────────────────────────────────────────

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: `Ești Mester AI — un asistent priceput și prietenos pentru probleme casnice din România. Vorbești calm, direct și uman — ca un vecin meșter de încredere. Explici de ce, nu doar ce. Folosești termeni simpli, nu tehnici. Inviți utilizatorul să continue conversația. La final menționezi întotdeauna materialele necesare și când să cheme un specialist. Răspunzi DOAR în română.`,
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// ── askMester ─────────────────────────────────────────────────────────────────

export async function askMester(
  userMessage: string,
  category: string,
  conversationHistory: ChatMessage[]
): Promise<string> {
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: `Categoria problemei este: ${category}.` }],
      },
      {
        role: 'model',
        parts: [{ text: `Înțeles! Sunt pregătit să te ajut cu probleme de ${category}.` }],
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
