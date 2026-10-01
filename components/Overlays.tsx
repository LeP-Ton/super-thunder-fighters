import React from 'react';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { Translation } from '../i18n';

interface GameOverOverlayProps {
  t: Translation;
  score: number;
  onRedeploy: () => void;
  onBackHome: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({ t, score, onRedeploy, onBackHome }) => (
  <div className="screen-overlay result-overlay">
    <div className="eyebrow danger">SIGNAL LOST / MISSION TERMINATED</div>
    <div className="result-emblem">✕</div>
    <h2>{t.missionFailed}</h2>
    <p>{t.failedDesc}</p>
    <div className="result-score"><span>{t.finalScore}</span><strong>{score.toLocaleString()}</strong></div>
    <button className="primary-button" onClick={onRedeploy}><RotateCcw size={17} />{t.redeploy}</button>
    <button className="text-button" onClick={onBackHome}><ArrowLeft size={16} />{t.backHome}</button>
  </div>
);

interface PauseOverlayProps {
  t: Translation;
  onResume: () => void;
  onBackHome: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({ t, onResume, onBackHome }) => (
  <div className="screen-overlay result-overlay pause-overlay">
    <div className="eyebrow">COMBAT SYSTEM / STANDBY</div>
    <div className="result-emblem pause-emblem">Ⅱ</div>
    <h2>{t.pauseTitle}</h2>
    <p>{t.subtitle}</p>
    <button className="primary-button" onClick={onResume}><Play size={17} fill="currentColor" />{t.resume}</button>
    <button className="text-button" onClick={onBackHome}><ArrowLeft size={16} />{t.backHome}</button>
  </div>
);
