import React from 'react';
import { X } from 'lucide-react';
import { Difficulty } from '../types';
import { Language, Translation, translations } from '../i18n';

interface SettingsModalProps {
  t: Translation;
  language: Language;
  difficulty: Difficulty;
  onClose: () => void;
  onChangeLanguage: (lang: Language) => void;
  onChangeDifficulty: (diff: Difficulty) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  t,
  language,
  difficulty,
  onClose,
  onChangeLanguage,
  onChangeDifficulty
}) => {
  return (
    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-30 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-8 text-sky-400">
          <h2 className="text-xl font-bold uppercase italic">{t.settings}</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <label className="text-slate-400 text-[10px] uppercase block mb-2">{t.langName}</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(translations) as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => onChangeLanguage(l)}
                  className={`py-2 rounded font-bold text-xs ${language === l ? 'bg-sky-500 text-slate-950' : 'bg-slate-800'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-[10px] uppercase block mb-2">{t.difficulty}</label>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onChangeDifficulty(d)}
                  className={`py-2 rounded font-black text-[10px] ${
                    difficulty === d
                      ? d === 'easy'
                        ? 'bg-green-500 text-slate-950'
                        : d === 'hard'
                          ? 'bg-rose-500 text-slate-950'
                          : 'bg-sky-500 text-slate-950'
                      : 'text-slate-500'
                  }`}
                >
                  {t[d]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-full mt-8 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl uppercase">
          OK
        </button>
      </div>
    </div>
  );
};
