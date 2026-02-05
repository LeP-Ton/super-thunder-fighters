
// Implement real Gemini API for tactical briefings with proper typing and error handling.
import { GoogleGenAI, Type } from "@google/genai";
import { Language } from "../i18n";

export interface Briefing {
  title: string;
  message: string;
  tacticalAdvice: string;
  isQuotaError?: boolean;
}

export const FALLBACK_BRIEFING: Briefing = {
  title: "Vanguard Ready",
  message: "All systems online. Neural link stable.",
  tacticalAdvice: "Stay focused, Commander."
};

/**
 * Fetches a dynamic pilot briefing from the Gemini API.
 * Uses gemini-3-flash-preview for quick and efficient text generation.
 */
export async function getPilotBriefing(level: number, score: number, lang: Language = 'en'): Promise<Briefing> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short tactical briefing for a space combat game in ${lang}. 
      Context: Current Level ${level}, Total Score ${score}.
      The briefing should include a creative mission title, a flavor text message (max 2 sentences), and one relevant tactical advice string.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            message: { type: Type.STRING },
            tacticalAdvice: { type: Type.STRING }
          },
          required: ["title", "message", "tacticalAdvice"]
        }
      }
    });

    const text = response.text;
    if (!text) return FALLBACK_BRIEFING;

    const data = JSON.parse(text);
    return {
      title: data.title || FALLBACK_BRIEFING.title,
      message: data.message || FALLBACK_BRIEFING.message,
      tacticalAdvice: data.tacticalAdvice || FALLBACK_BRIEFING.tacticalAdvice
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return FALLBACK_BRIEFING;
  }
}
