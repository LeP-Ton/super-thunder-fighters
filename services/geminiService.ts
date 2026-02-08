
// Local, static tactical briefings (no network calls).
import { Language, translations } from "../i18n";

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

const getStaticBriefings = (lang: Language): Briefing[] => {
  const pool = translations[lang]?.briefings ?? [];
  if (pool.length > 0) return pool;
  const fallbackPool = translations.en?.briefings ?? [];
  return fallbackPool.length > 0 ? fallbackPool : [FALLBACK_BRIEFING];
};

/**
 * Returns a random static briefing (no network calls).
 */
export async function getPilotBriefing(level: number, score: number, lang: Language = 'en'): Promise<Briefing> {
  const pool = getStaticBriefings(lang);
  const index = Math.floor(Math.random() * pool.length);
  const pick = pool[index] || FALLBACK_BRIEFING;
  return {
    title: pick.title || FALLBACK_BRIEFING.title,
    message: pick.message || FALLBACK_BRIEFING.message,
    tacticalAdvice: pick.tacticalAdvice || FALLBACK_BRIEFING.tacticalAdvice
  };
}
