import React from 'react';
import { Crosshair, Info, Play, Settings, Terminal, Zap } from 'lucide-react';
import { Translation } from '../i18n';
import { Briefing } from '../services/geminiService';

interface StartOverlayProps {
  t: Translation;
  briefing: Briefing | null;
  canStart: boolean;
  onStart: () => void;
  onShowIntel: () => void;
  onShowHangar: () => void;
  onShowSettings: () => void;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({ t, briefing, canStart, onStart, onShowIntel, onShowHangar, onShowSettings }) => {
  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center rounded-xl p-8 text-center overflow-y-auto">
      <h1 className="text-5xl font-black mb-2 text-sky-400 tracking-tighter uppercase italic">{t.title}</h1>
      <p className="text-slate-400 mb-8 max-w-sm">{t.subtitle}</p>

      <div className="bg-slate-900/80 p-6 rounded-xl border border-sky-900/50 mb-8 w-full max-w-lg">
        <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-sky-400 mb-4">
          <Terminal className="w-4 h-4" />
          <span>{t.briefingTitle}</span>
        </div>
        {briefing && (
          <div className="text-left space-y-4">
            <h3 className="text-xl font-bold uppercase italic text-white tracking-widest border-l-4 border-sky-500 pl-3">{briefing.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed font-mono italic">{briefing.message}</p>
            <div className="pt-3 border-t border-slate-800 bg-slate-950/40 p-3 rounded-lg">
              <p className="text-xs font-bold uppercase text-sky-300 flex items-center gap-2 mb-1">
                <Zap className="w-3 h-3" /> {t.combatAdviceLabel}:
              </p>
              <p className="text-xs text-slate-400 italic">{briefing.tacticalAdvice}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`flex items-center justify-center gap-3 px-10 py-4 font-bold rounded-full transition-all transform ${
            canStart ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Play className="fill-current w-5 h-5" /> {t.initiate}
        </button>
        <div className="flex gap-3">
          <button onClick={onShowIntel} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-full border border-sky-900/50 text-sm flex items-center justify-center gap-2">
            <Info className="w-4 h-4" />
            {t.intel}
          </button>
          <button onClick={onShowHangar} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-full border border-sky-900/50 text-sm flex items-center justify-center gap-2">
            <Crosshair className="w-4 h-4" />
            {t.hangarTitle}
          </button>
        </div>
        <button onClick={onShowSettings} className="py-3 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-full border border-sky-900/50 text-sm flex items-center justify-center gap-2">
          <Settings className="w-4 h-4" />
          {t.settings}
        </button>
      </div>
    </div>
  );
};
