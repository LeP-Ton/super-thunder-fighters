import React from 'react';
import { Play, RotateCcw, Terminal } from 'lucide-react';
import { Translation } from '../i18n';

interface GameOverOverlayProps {
  t: Translation;
  score: number;
  onRedeploy: () => void;
  onBackHome: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({ t, score, onRedeploy, onBackHome }) => {
  return (
    <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-lg flex flex-col items-center justify-center rounded-xl p-8 text-center z-50">
      <h2 className="text-6xl font-black mb-2 text-rose-500 italic uppercase">{t.missionFailed}</h2>
      <div className="mb-8">
        <span className="text-slate-400 text-xs block uppercase mb-1">{t.finalScore}</span>
        <span className="text-4xl font-mono font-bold text-white">{score.toLocaleString()}</span>
      </div>
      <div className="flex flex-col gap-3">
        <button onClick={onRedeploy} className="flex items-center justify-center gap-3 px-10 py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-full transform hover:scale-110">
          <RotateCcw className="w-5 h-5" /> {t.redeploy}
        </button>
        <button onClick={onBackHome} className="flex items-center justify-center gap-3 px-10 py-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-full border border-slate-700">
          <Terminal className="w-5 h-5" /> {t.backHome}
        </button>
      </div>
    </div>
  );
};

interface PauseOverlayProps {
  t: Translation;
  onResume: () => void;
  onBackHome: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({ t, onResume, onBackHome }) => {
  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center rounded-xl p-8 text-center z-40">
      <h2 className="text-5xl font-black mb-3 text-sky-400 italic uppercase">{t.pauseTitle}</h2>
      <p className="text-slate-400 mb-8 max-w-sm">{t.subtitle}</p>
      <div className="flex flex-col gap-3">
        <button onClick={onResume} className="flex items-center justify-center gap-3 px-10 py-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-full transform hover:scale-110">
          <Play className="w-5 h-5 fill-current" /> {t.resume}
        </button>
        <button onClick={onBackHome} className="flex items-center justify-center gap-3 px-10 py-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-full border border-slate-700">
          <Terminal className="w-5 h-5" /> {t.backHome}
        </button>
      </div>
    </div>
  );
};
