import React from 'react';
import { Shield, Trophy, Zap } from 'lucide-react';
import { Difficulty } from '../types';
import { ENERGY_MAX } from '../planes';
import { Translation } from '../i18n';

interface HudBarProps {
  score: number;
  level: number;
  health: number;
  maxHealth: number;
  energy: number;
  difficulty: Difficulty;
  t: Translation;
}

export const HudBar: React.FC<HudBarProps> = ({ score, level, health, maxHealth, energy, difficulty, t }) => {
  return (
    <div className="w-full max-w-[600px] flex justify-between items-center mb-4 px-4 bg-slate-900/50 py-3 rounded-lg border border-slate-800 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="text-xl font-mono">{score.toString().padStart(6, '0')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-sky-400" />
          <span className="text-lg font-mono">{t.level}.{level}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-1 justify-end">
        <div className="flex flex-col items-end gap-1">
          <div className="w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-300 ${health / maxHealth < 0.3 ? 'bg-rose-500' : 'bg-sky-500'}`}
              style={{ width: `${(health / maxHealth) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: ENERGY_MAX }).map((_, i) => (
                <span key={`energy-${i}`} className={`w-2 h-2 rounded-sm ${energy > i ? 'bg-amber-400' : 'bg-slate-700'}`} />
              ))}
            </div>
            <span className="text-[10px] font-bold uppercase text-amber-400">{t.energy}</span>
          </div>
          <span
            className={`text-[10px] font-bold uppercase ${
              difficulty === 'easy' ? 'text-green-500' : difficulty === 'hard' ? 'text-rose-500' : 'text-sky-400'
            }`}
          >
            {t[difficulty]} MODE
          </span>
        </div>
        <Shield className={`w-5 h-5 ${health / maxHealth < 0.3 ? 'text-rose-500 animate-pulse' : 'text-sky-400'}`} />
      </div>
    </div>
  );
};
