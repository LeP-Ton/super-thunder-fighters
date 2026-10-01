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

export const SettingsModal: React.FC<SettingsModalProps> = ({ t, language, difficulty, onClose, onChangeLanguage, onChangeDifficulty }) => (
  <div className="screen-overlay modal-overlay">
    <div className="modal-panel settings-panel">
      <div className="modal-header"><div><span className="eyebrow">GAME OPTIONS / ARCADE</span><h2>{t.settings}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.backHome}><X size={20} /></button></div>
      <div className="settings-content">
        <div className="setting-group"><span className="eyebrow">{t.langName} / LANGUAGE</span><div className="segmented languages">{(Object.keys(translations) as Language[]).map((item) => <button key={item} className={language === item ? 'active' : ''} onClick={() => onChangeLanguage(item)} aria-pressed={language === item}>{item.toUpperCase()}</button>)}</div></div>
        <div className="setting-group"><span className="eyebrow">{t.difficulty} / DIFFICULTY</span><div className="segmented">{(['easy', 'normal', 'hard'] as Difficulty[]).map((item) => <button key={item} className={difficulty === item ? 'active' : ''} onClick={() => onChangeDifficulty(item)} aria-pressed={difficulty === item}>{t[item]}</button>)}</div><p>{t.difficultyDesc}</p></div>
      </div>
      <div className="modal-footer"><span>READY TO PLAY</span><button className="secondary-button" onClick={onClose}>{t.backHome}</button></div>
    </div>
  </div>
);
